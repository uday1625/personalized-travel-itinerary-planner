import random
from typing import Any


def calculate_travel_time(location1: str, location2: str) -> int:
    """Return a mocked travel duration in minutes between two locations."""
    if not location1.strip() or not location2.strip():
        raise ValueError("Both locations must be non-empty")
    return random.randint(10, 30)


def optimize_itinerary(activities: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Sort activities by scheduled_time and add travel times to the next stop."""
    for index, activity in enumerate(activities):
        if not isinstance(activity, dict):
            raise TypeError(f"Activity at index {index} must be a dictionary")
        if not isinstance(activity.get("scheduled_time"), str):
            raise ValueError(
                f"Activity at index {index} must have a string scheduled_time"
            )
        if not isinstance(activity.get("location"), str):
            raise ValueError(f"Activity at index {index} must have a string location")

    optimized = sorted(activities, key=lambda activity: activity["scheduled_time"])
    for current, next_activity in zip(optimized, optimized[1:]):
        current["travel_time_to_next"] = calculate_travel_time(
            current["location"],
            next_activity["location"],
        )

    if optimized:
        optimized[-1]["travel_time_to_next"] = None

    return optimized