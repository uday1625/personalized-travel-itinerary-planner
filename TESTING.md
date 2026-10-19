# Testing and Production Readiness

This guide covers the key user workflows and the basic production build and
configuration checks for the Personalized Travel Itinerary Planner.

## Test Scenarios

| # | Scenario | Steps | Expected result |
|---|---|---|---|
| 1 | Trip form validation | Submit the trip form with required fields empty, invalid dates, or invalid budget values; then submit a valid trip. | Invalid input is identified and cannot be submitted. Valid trip details are accepted and sent to the API. |
| 2 | AI prompt generation | Submit a trip with a destination, dates, budget, pace, and preferences to the itinerary-generation flow. | The backend builds a prompt containing the supplied trip details and returns a structured itinerary for the requested trip. |
| 3 | Database CRUD | With a valid authenticated session, create a trip, view the trip history, and delete the trip. | The trip is stored in Supabase, appears only for its owner, and disappears from the list after deletion. Requests without valid authorization are rejected. |
| 4 | Export to TXT | Open a trip details page, select **Download**, and inspect the downloaded `itinerary.txt`. | The text file contains the trip's formatted itinerary summary and is readable without application-specific formatting. |
| 5 | Share link copy | Open a trip details page and select **Share** in a secure browser context. Paste the clipboard contents into a text field. | The current page URL is copied and a temporary “Link Copied!” confirmation is displayed. |

## Production Build Steps

Build the React frontend from the `frontend` directory:

```bash
cd frontend
npm ci
npm run build
```

The production-ready static assets are written to `frontend/dist`. Configure
the deployment platform to serve this directory and set
`VITE_API_BASE_URL` to the publicly reachable FastAPI base URL before
building.

Run the FastAPI backend from the `backend` directory:

```bash
cd backend
python -m pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

For production, run behind a managed process supervisor or deployment
platform, configure HTTPS at the edge, and set the environment variables
listed below. Do not enable development reload in production.

## Environment Configuration

Before deploying, verify that the backend environment contains:

- [ ] `SUPABASE_URL` — URL of the Supabase project.
- [ ] `SUPABASE_KEY` — Supabase anon/public key.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` — backend-only service-role key used for
  privileged database operations. It bypasses RLS and must never be exposed
  to the frontend or committed to source control.
- [ ] `GROQ_API_KEY` — Groq API key for AI itinerary generation.

Frontend configuration:

- [ ] `VITE_API_BASE_URL` — public base URL of the FastAPI service, such as
  `https://api.example.com`. Only public values belong in `VITE_` variables;
  they are included in the browser bundle.

Keep local values in untracked environment files and configure production
secrets through the hosting provider's environment-variable settings.

## Performance Optimization

- **Code splitting:** Split larger screens and features into separate bundles
  so visitors download only the code needed for the current view.
- **Lazy loading:** Load route-level components and non-critical UI on demand
  to improve initial page load time.
- **Database indexing:** Index columns frequently used in filters and joins,
  including trip ownership and itinerary lookups by trip and date. Check query
  plans and actual access patterns before adding indexes.