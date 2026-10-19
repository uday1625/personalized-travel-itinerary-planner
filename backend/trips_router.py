import json
import logging
from datetime import date, datetime
from uuid import UUID

import httpx
from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field, ValidationError, model_validator
from postgrest.exceptions import APIError as PostgrestAPIError
from supabase_auth.errors import AuthError

from ai_engine import generate_itinerary
from db_client import get_client, get_service_client
from itinerary_service import DayPlan, ItineraryBuilder
from llm_provider import GroqProvider
from models import TripCreate
from prompt_engine import build_itinerary_prompt
from route_optimizer import optimize_itinerary

router = APIRouter(tags=["trips"])
logger = logging.getLogger(__name__)
bearer_scheme = HTTPBearer(auto_error=False)

_mock_trips: dict[UUID, TripCreate] = {}


class TripCreatedResponse(BaseModel):
    message: str
    trip_id: UUID


class TripResponse(TripCreate):
    trip_id: UUID


class TripExportResponse(BaseModel):
    trip: dict[str, object]
    itinerary_items: list[dict[str, object]]
    formatted_summary: str


def get_current_user_id(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> UUID:
    """Verify the Supabase bearer token and return its authenticated user ID."""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="An Authorization header with a valid access token is required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        auth_response = get_client().auth.get_user(credentials.credentials)
    except AuthError as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from error
    except RuntimeError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase authentication is not configured",
        ) from error
    except httpx.HTTPError as error:
        logger.exception("Supabase token verification failed")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service is unavailable",
        ) from error

    if auth_response is None or auth_response.user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return UUID(auth_response.user.id)


class GenerateItineraryRequest(BaseModel):
    trip_id: UUID


class BuildItineraryRequest(BaseModel):
    trip_id: UUID | None = None
    prompt: str | None = Field(default=None, min_length=1)

    @model_validator(mode="after")
    def validate_input(self) -> "BuildItineraryRequest":
        if (self.trip_id is None) == (self.prompt is None):
            raise ValueError("Provide exactly one of trip_id or prompt")
        if self.prompt is not None and not self.prompt.strip():
            raise ValueError("prompt must not be empty")
        return self


class ItineraryActivity(BaseModel):
    day: int = Field(ge=1)
    time: str = Field(pattern=r"^(?:[01]\d|2[0-3]):[0-5]\d$")
    activity_name: str = Field(min_length=1)
    location: str = Field(min_length=1)
    estimated_cost: float = Field(ge=0)
    description: str = Field(min_length=1)
    travel_time_to_next: int | None = Field(default=None, ge=10, le=30)


def _format_itinerary_summary(
    trip: dict[str, object],
    itinerary_items: list[dict[str, object]],
) -> str:
    title = str(trip.get("title") or trip.get("destination") or "Trip")
    lines = [title]
    if trip.get("destination"):
        lines.append(f"Destination: {trip['destination']}")
    if trip.get("start_date") or trip.get("end_date"):
        lines.append(
            f"Dates: {trip.get('start_date') or 'TBD'} to {trip.get('end_date') or 'TBD'}"
        )

    if not itinerary_items:
        lines.extend(["", "No itinerary items have been added yet."])
        return "\n".join(lines)

    try:
        trip_start = date.fromisoformat(str(trip["start_date"]))
    except (KeyError, TypeError, ValueError):
        trip_start = None

    lines.append("")
    for index, item in enumerate(itinerary_items):
        starts_at_value = item.get("starts_at")
        try:
            starts_at = datetime.fromisoformat(
                str(starts_at_value).replace("Z", "+00:00")
            )
        except (TypeError, ValueError):
            starts_at = None

        if starts_at is not None and trip_start is not None:
            day_number = (starts_at.date() - trip_start).days + 1
            day_number = max(day_number, 1)
        elif starts_at is not None:
            day_number = index + 1
        else:
            day_number = 1

        if starts_at is None:
            period = "Schedule"
            time_label = ""
        else:
            hour = starts_at.hour
            period = "Morning" if hour < 12 else "Afternoon" if hour < 18 else "Evening"
            time_label = f" ({starts_at.strftime('%H:%M')})"

        activity_name = str(item.get("title") or "Untitled activity")
        location = item.get("location")
        description = item.get("description")
        cost = item.get("estimated_cost")
        details = [f"Day {day_number}: {period}{time_label} - {activity_name}"]
        if location:
            details.append(f"Location: {location}")
        if description:
            details.append(str(description))
        if cost is not None:
            details.append(f"Estimated cost: {cost}")
        lines.append("\n".join(details))

    return "\n".join(lines)


@router.post(
    "/trips",
    response_model=TripCreatedResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_trip(
    trip: TripCreate,
    user_id: UUID = Depends(get_current_user_id),
) -> TripCreatedResponse:
    trip_data = trip.model_dump(mode="json")
    trip_data.update(
        {
            "user_id": str(user_id),
            "title": f"Trip to {trip.destination}",
        }
    )

    try:
        response = (
            get_service_client()
            .table("trips")
            .insert(trip_data)
            .select("id")
            .single()
            .execute()
        )
    except RuntimeError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase database is not configured",
        ) from error
    except (PostgrestAPIError, httpx.HTTPError) as error:
        logger.exception("Failed to create trip in Supabase")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to save trip",
        ) from error

    if not response.data or not response.data.get("id"):
        logger.error("Supabase trip insert returned no trip ID")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Trip could not be saved",
        )

    trip_id = UUID(str(response.data["id"]))
    _mock_trips[trip_id] = trip
    return TripCreatedResponse(
        message="Trip created successfully",
        trip_id=trip_id,
    )


@router.post(
    "/generate-itinerary",
    response_model=list[ItineraryActivity],
)
def generate_itinerary_for_trip(
    request: GenerateItineraryRequest,
) -> list[ItineraryActivity]:
    """Generate and validate an itinerary for a previously created trip."""
    trip = _mock_trips.get(request.trip_id)
    if trip is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trip not found",
        )

    prompt = build_itinerary_prompt(trip.model_dump(mode="json"))
    generated_json = generate_itinerary(prompt)
    try:
        generated_data = json.loads(generated_json)
    except json.JSONDecodeError as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="The itinerary generator returned invalid JSON",
        ) from error

    if not isinstance(generated_data, list):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="The itinerary generator did not return a JSON array",
        )

    try:
        activities = [
            ItineraryActivity.model_validate(activity)
            for activity in generated_data
        ]
    except ValidationError as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="The itinerary generator returned an invalid itinerary",
        ) from error

    optimizer_input = [
        {
            **activity.model_dump(),
            "scheduled_time": activity.time,
        }
        for activity in activities
    ]
    optimized_activities = optimize_itinerary(optimizer_input)
    return [
        ItineraryActivity.model_validate(
            {key: value for key, value in activity.items() if key != "scheduled_time"}
        )
        for activity in optimized_activities
    ]


@router.post(
    "/build-itinerary",
    response_model=list[DayPlan],
)
async def build_itinerary(
    request: BuildItineraryRequest,
) -> list[DayPlan]:
    """Build a structured itinerary from a saved trip or a supplied prompt."""
    if request.prompt is not None:
        prompt = request.prompt
    else:
        trip = _mock_trips.get(request.trip_id)
        if trip is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Trip not found",
            )
        prompt = build_itinerary_prompt(trip.model_dump(mode="json"))
        prompt += """

Return the itinerary as a JSON array of day objects, not as individual
activity objects. Each day object must have exactly these keys: "day"
(integer), "morning" (array), "afternoon" (array), and "evening" (array).
Each activity object must have exactly these keys: "time", "name",
"description", and "location". Use empty arrays when a time period has no
activities. Return only valid JSON with no Markdown or extra text."""

    try:
        builder = ItineraryBuilder(GroqProvider())
    except RuntimeError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(error),
        ) from error

    try:
        return await builder.generate_daily_itinerary(prompt)
    except (RuntimeError, ValueError) as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(error),
        ) from error


@router.get("/trips", response_model=list[TripResponse])
def list_trips(user_id: UUID = Depends(get_current_user_id)) -> list[TripResponse]:
    """List trips belonging to the authenticated user."""
    try:
        response = (
            get_service_client()
            .table("trips")
            .select("*")
            .eq("user_id", str(user_id))
            .order("created_at", desc=True)
            .execute()
        )
    except RuntimeError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase database is not configured",
        ) from error
    except (PostgrestAPIError, httpx.HTTPError) as error:
        logger.exception("Failed to fetch trips from Supabase")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to fetch trips",
        ) from error

    return [
        TripResponse(
            trip_id=UUID(str(row["id"])),
            destination=row["destination"],
            start_date=row["start_date"],
            end_date=row["end_date"],
            budget=row["budget"],
            num_travelers=row["num_travelers"],
            interests=row["interests"],
            dietary_needs=row["dietary_needs"],
            travel_pace=row["travel_pace"],
        )
        for row in response.data or []
    ]


@router.get(
    "/trips/{trip_id}/export",
    response_model=TripExportResponse,
)
def export_trip(
    trip_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
) -> TripExportResponse:
    """Fetch an owned trip and return its details with a readable summary."""
    try:
        client = get_service_client()
        trip_response = (
            client.table("trips")
            .select("*")
            .eq("id", str(trip_id))
            .eq("user_id", str(user_id))
            .maybe_single()
            .execute()
        )
        if not trip_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Trip not found",
            )

        itinerary_response = (
            client.table("itineraries")
            .select("*")
            .eq("trip_id", str(trip_id))
            .eq("user_id", str(user_id))
            .order("sort_order")
            .order("starts_at")
            .execute()
        )
    except HTTPException:
        raise
    except RuntimeError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase database is not configured",
        ) from error
    except (PostgrestAPIError, httpx.HTTPError) as error:
        logger.exception("Failed to export trip from Supabase")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to export trip",
        ) from error

    trip_data = trip_response.data
    items = itinerary_response.data or []
    return TripExportResponse(
        trip=trip_data,
        itinerary_items=items,
        formatted_summary=_format_itinerary_summary(trip_data, items),
    )


@router.delete("/trips/{trip_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_trip(
    trip_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
) -> Response:
    """Delete a trip only if it belongs to the authenticated user."""
    try:
        response = (
            get_service_client()
            .table("trips")
            .delete()
            .eq("id", str(trip_id))
            .eq("user_id", str(user_id))
            .execute()
        )
    except RuntimeError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase database is not configured",
        ) from error
    except (PostgrestAPIError, httpx.HTTPError) as error:
        logger.exception("Failed to delete trip from Supabase")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to delete trip",
        ) from error

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trip not found",
        )

    _mock_trips.pop(trip_id, None)
    return Response(status_code=status.HTTP_204_NO_CONTENT)