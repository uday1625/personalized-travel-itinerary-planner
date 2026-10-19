# Travel Planner API

## Overview

This document describes the proposed API contract for the travel planner. The
current FastAPI starter only implements `GET /` and `GET /health`; the `/api`
endpoints below are planned and must be implemented before they are available.

Base URL: `http://localhost:8000`

Except for the health check, endpoints require a valid Supabase access token:

```http
Authorization: Bearer <supabase_access_token>
```

All request and response bodies use JSON. Dates use `YYYY-MM-DD`; timestamps
use ISO 8601 with a timezone.

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Check whether the API is running. |
| `GET` | `/api/users/me` | Get the signed-in user's profile and preferences. |
| `PATCH` | `/api/users/me` | Update the signed-in user's profile or preferences. |
| `GET` | `/api/trips` | List the signed-in user's trips. |
| `POST` | `/api/trips` | Create a trip. |
| `GET` | `/api/trips/{trip_id}` | Get one of the signed-in user's trips. |
| `PATCH` | `/api/trips/{trip_id}` | Update a trip. |
| `DELETE` | `/api/trips/{trip_id}` | Delete a trip and its itinerary items. |
| `GET` | `/api/itinerary?trip_id={trip_id}` | List itinerary items for a trip. |
| `POST` | `/api/trips/{trip_id}/itinerary` | Add an itinerary item to a trip. |
| `PATCH` | `/api/itinerary/{item_id}` | Update an itinerary item. |
| `DELETE` | `/api/itinerary/{item_id}` | Delete an itinerary item. |
| `POST` | `/api/trips/{trip_id}/generate-itinerary` | Generate itinerary suggestions for a trip. |

## Example: create a trip

`POST /api/trips`

```json
{
  "title": "A week in Japan",
  "destination": "Tokyo, Japan",
  "start_date": "2026-11-01",
  "end_date": "2026-11-07",
  "budget": 2500,
  "currency": "USD",
  "notes": "Interested in food and museums"
}
```

Successful response: `201 Created`

```json
{
  "id": "trip-uuid",
  "title": "A week in Japan",
  "destination": "Tokyo, Japan",
  "start_date": "2026-11-01",
  "end_date": "2026-11-07",
  "budget": 2500,
  "currency": "USD",
  "notes": "Interested in food and museums",
  "created_at": "2026-10-19T12:00:00Z",
  "updated_at": "2026-10-19T12:00:00Z"
}
```

## Example: get a trip's itinerary

`GET /api/itinerary?trip_id=trip-uuid`

```json
[
  {
    "id": "item-uuid",
    "trip_id": "trip-uuid",
    "title": "Visit Senso-ji",
    "description": "Explore the temple and surrounding streets.",
    "location": "Asakusa, Tokyo",
    "starts_at": "2026-11-02T09:00:00+09:00",
    "ends_at": "2026-11-02T11:00:00+09:00",
    "category": "sightseeing",
    "sort_order": 0,
    "cost": 0
  }
]
```

## Example: add an itinerary item

`POST /api/trips/{trip_id}/itinerary`

```json
{
  "title": "Visit Senso-ji",
  "description": "Explore the temple and surrounding streets.",
  "location": "Asakusa, Tokyo",
  "starts_at": "2026-11-02T09:00:00+09:00",
  "ends_at": "2026-11-02T11:00:00+09:00",
  "category": "sightseeing",
  "sort_order": 0,
  "cost": 0
}
```

## Example: update preferences

`PATCH /api/users/me`

```json
{
  "full_name": "Alex Traveler",
  "preferences": {
    "interests": ["food", "museums"],
    "pace": "moderate",
    "travel_style": "culture"
  }
}
```

## Response and error conventions

Use standard HTTP status codes:

- `200 OK` for successful reads and updates.
- `201 Created` when a resource is created.
- `204 No Content` when a resource is deleted successfully.
- `400 Bad Request` for invalid input.
- `401 Unauthorized` when authentication is missing or invalid.
- `403 Forbidden` when the caller is not allowed to access a resource.
- `404 Not Found` when a resource does not exist or is not visible to the caller.
- `422 Unprocessable Entity` for request validation errors.
- `500 Internal Server Error` for unexpected server errors.

Return errors in a consistent shape, for example:

```json
{
  "detail": "The end date must be on or after the start date."
}
```

The API must derive the user identity from the verified access token rather than
trusting a `user_id` supplied in the request body. Enforce ownership for trips
and itinerary items on every operation, in addition to the database's
row-level-security policies.
