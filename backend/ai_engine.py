import json
from typing import Any


_MOCK_ACTIVITIES = (
    (1, "09:00", "Explore the historic center", "Old town", 0.0),
    (1, "13:00", "Enjoy a local lunch", "Local restaurant", 35.0),
    (2, "09:30", "Visit a local museum", "City museum", 25.0),
    (2, "14:00", "Walk through a scenic district", "Riverside district", 0.0),
    (3, "09:00", "Visit a nearby landmark", "Local landmark", 20.0),
    (3, "13:00", "Browse a local market", "Central market", 15.0),
)


def generate_itinerary(prompt: str) -> str:
    """Return a mock three-day itinerary as a JSON array string."""
    if not isinstance(prompt, str):
        raise TypeError("prompt must be a string")

    details_marker = "TRIP DETAILS\n"
    details_section = prompt.partition(details_marker)[2]
    if not details_section:
        raise ValueError("prompt must include a TRIP DETAILS section")

    details_json = details_section.partition("\n\nPLANNING REQUIREMENTS")[0]
    try:
        trip_data: dict[str, Any] = json.loads(details_json)
    except json.JSONDecodeError as error:
        raise ValueError("prompt contains invalid JSON in its TRIP DETAILS section") from error

    destination = trip_data.get("destination")
    if not isinstance(destination, str) or not destination.strip():
        raise ValueError("prompt trip details must include a destination")

    itinerary = [
        {
            "day": day,
            "time": time,
            "activity_name": activity_name,
            "location": f"{location}, {destination.strip()}",
            "estimated_cost": estimated_cost,
            "description": f"Mock itinerary suggestion for {destination.strip()}.",
        }
        for day, time, activity_name, location, estimated_cost in _MOCK_ACTIVITIES
    ]

    # Replace this mock with a Gemini or OpenAI client call when ready. Read the
    # provider API key from a backend environment variable; never hard-code it.
    return json.dumps(itinerary, ensure_ascii=False, indent=2)