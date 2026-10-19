import json
from typing import List

from pydantic import BaseModel, ConfigDict, Field, TypeAdapter, ValidationError

from llm_provider import LLMProvider


class Activity(BaseModel):
    model_config = ConfigDict(extra="forbid")

    time: str = Field(min_length=1)
    name: str = Field(min_length=1)
    description: str = Field(min_length=1)
    location: str = Field(min_length=1)


class DayPlan(BaseModel):
    model_config = ConfigDict(extra="forbid")

    day: int = Field(ge=1)
    morning: List[Activity]
    afternoon: List[Activity]
    evening: List[Activity]


class ItineraryBuilder:
    def __init__(self, provider: LLMProvider) -> None:
        self._provider = provider
        self._day_plan_adapter = TypeAdapter(List[DayPlan])

    async def generate_daily_itinerary(self, prompt: str) -> List[DayPlan]:
        response = await self._provider.generate_response(prompt)
        try:
            itinerary_data = json.loads(response)
        except json.JSONDecodeError as error:
            raise ValueError("LLM provider returned invalid itinerary JSON") from error

        try:
            return self._day_plan_adapter.validate_python(itinerary_data)
        except ValidationError as error:
            raise ValueError(
                "LLM provider response does not match the expected day plan format"
            ) from error