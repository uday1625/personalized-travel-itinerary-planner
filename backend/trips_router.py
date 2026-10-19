import json
from uuid import UUID, uuid4

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field, ValidationError

from ai_engine import generate_itinerary
from models import TripCreate
from prompt_engine import build_itinerary_prompt

router = APIRouter(tags=["trips"])

_mock_trips: dict[UUID, TripCreate] = {}


class TripCreatedResponse(BaseModel):
    message: str
    trip_id: UUID


class TripResponse(TripCreate):
    trip_id: UUID


class GenerateItineraryRequest(BaseModel):
    trip_id: UUID


class ItineraryActivity(BaseModel):
    day: int = Field(ge=1)
    time: str = Field(pattern=r"^(?:[01]\d|2[0-3]):[0-5]\d$")
    activity_name: str = Field(min_length=1)
    location: str = Field(min_length=1)
    estimated_cost: float = Field(ge=0)
    description: str = Field(min_length=1)


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
        return [
            ItineraryActivity.model_validate(activity)
            for activity in generated_data
        ]
    except ValidationError as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="The itinerary generator returned an invalid itinerary",
        ) from error


@router.get("/trips", response_model=list[TripResponse])
def list_trips() -> list[TripResponse]:
    """List trips saved in the process-local mock store."""
    return [
        TripResponse(trip_id=trip_id, **trip.model_dump())
        for trip_id, trip in _mock_trips.items()
    ]