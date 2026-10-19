from datetime import date
from decimal import Decimal
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class RequestModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class UserRegister(RequestModel):
    email: Annotated[
        str,
        Field(
            pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$",
            max_length=254,
        ),
    ]
    password: Annotated[str, Field(min_length=8)]


class UserLogin(RequestModel):
    email: Annotated[
        str,
        Field(
            pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$",
            max_length=254,
        ),
    ]
    password: Annotated[str, Field(min_length=8)]


class TripCreate(RequestModel):
    destination: Annotated[str, Field(min_length=1, max_length=200)]
    start_date: date
    end_date: date
    budget: Annotated[Decimal, Field(ge=0, max_digits=12, decimal_places=2)]
    num_travelers: Annotated[int, Field(ge=1)]
    interests: list[Annotated[str, Field(min_length=1, max_length=100)]]
    dietary_needs: list[Annotated[str, Field(min_length=1, max_length=100)]]
    travel_pace: Literal["relaxed", "moderate", "fast"]

    @model_validator(mode="after")
    def validate_date_range(self) -> "TripCreate":
        if self.end_date < self.start_date:
            raise ValueError("end_date must be on or after start_date")
        return self
