from uuid import uuid4

from fastapi import APIRouter, status

from models import TripCreate

router = APIRouter(prefix="/api/trips", tags=["trips"])


@router.post("", status_code=status.HTTP_201_CREATED)
def create_trip(trip: TripCreate) -> dict[str, str]:
    return {
        "message": "Trip created successfully",
        "trip_id": str(uuid4()),
    }