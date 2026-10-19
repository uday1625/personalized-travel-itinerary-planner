# Application Architecture

## High-level design

The planned application uses a React single-page frontend, a FastAPI backend,
and Supabase for authentication and PostgreSQL storage.

```text
Browser
  |
  v
React + Vite frontend
  |  HTTPS / JSON + Supabase access token
  v
FastAPI backend
  |  verify identity, validate input, enforce ownership
  |  Supabase client / PostgreSQL with row-level security
  v
Supabase Auth + PostgreSQL
```

The browser should call the FastAPI API for application operations. The backend
is responsible for validating requests and user identity before reading or
writing data. Supabase Auth provides user accounts and access tokens;
PostgreSQL stores profiles, trips, and itinerary items. Row-level security
(RLS) provides a database-level ownership boundary as defense in depth.

## Components

### React frontend

- Built with React and Vite.
- Renders the trip-planning experience and sends JSON requests to FastAPI.
- Uses the configured API base URL (for example, `VITE_API_BASE_URL`) for
  backend requests.
- May use Supabase Auth client-side to sign users in and obtain an access
  token; send that token to FastAPI as a bearer token.
- Only `VITE_` variables intended for browser use belong in the frontend.
  Never put a Supabase service-role key or other secret in a Vite variable.

### FastAPI backend

- Serves the application API and health check.
- Validates request data, verifies bearer tokens, and derives the current user
  from the verified identity.
- Reads and writes profile, trip, and itinerary data in Supabase/PostgreSQL.
- Keeps privileged credentials on the server only. Prefer user-scoped
  access and RLS; never trust a client-supplied user ID for authorization.
- Restricts CORS to the deployed frontend origin in production.

### Supabase

- Supabase Auth manages user identity.
- PostgreSQL stores user profiles, trips, and itinerary items. See
  [`database/schema.sql`](./database/schema.sql) for the starter schema.
- Foreign keys and RLS policies enforce relationships and ownership in the
  database.

## Request flow

1. The user signs in through Supabase Auth in the frontend.
2. The frontend sends an API request to FastAPI with the Supabase access token.
3. FastAPI verifies the token, validates the request, and determines the
   authenticated user.
4. FastAPI performs the requested operation against Supabase/PostgreSQL.
5. Database constraints and RLS enforce valid relationships and record
   ownership.
6. FastAPI returns a JSON response to the frontend.

## Current starter status

The repository is an initial scaffold. The frontend currently renders a basic
landing page, and the FastAPI app currently exposes only `GET /` and
`GET /health`. The API, authentication flow, Supabase client integration, and
preference/itinerary-generation logic described here are planned components,
not implemented features yet.
