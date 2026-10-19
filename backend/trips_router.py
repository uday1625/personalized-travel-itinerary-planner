import json
from uuid import UUID, uuid4

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field, ValidationError, model_validator

from ai_engine import generate_itinerary
from itinerary_service import DayPlan, ItineraryBuilder
from llm_provider import GroqProvider
from models import TripCreate
from prompt_engine import build_itinerary_prompt
from route_optimizer import optimize_itinerary

router = APIRouter(tags=["trips"])

_mock_trips: dict[UUID, TripCreate] = {}


class TripCreatedResponse(BaseModel):
    message: str
    trip_id: UUID


class TripResponse(TripCreate):
    trip_id: UUID


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


@router.post(
    "/trips",
    response_model=TripCreatedResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_trip(trip: TripCreate) -> TripCreatedResponse:
    """Save a trip in the process-local mock store."""
    trip_id = uuid4()
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
def list_trips() -> list[TripResponse]:
    """List trips saved in the process-local mock store."""
    return [
        TripResponse(trip_id=trip_id, **trip.model_dump())
        for trip_id, trip in _mock_trips.items()
    ]