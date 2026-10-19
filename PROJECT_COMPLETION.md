# Project Completion Checklist

Use this checklist to track the planner from initial setup through release.
Items are complete when the implementation, configuration, and relevant
verification are in place.

## 1. Environment Setup

- [ ] Confirm Python, Node.js, npm, and Git versions.
- [ ] Create and activate the backend virtual environment.
- [ ] Install backend and frontend dependencies.
- [ ] Create local backend and frontend `.env` files.
- [ ] Document required environment variables and keep secrets out of Git.
- [ ] Confirm the frontend and backend start locally.

## 2. Supabase Database

- [ ] Create a Supabase project and configure Auth.
- [ ] Apply and verify `database/schema.sql`.
- [ ] Confirm user profiles are created when Auth users sign up.
- [ ] Verify trips and itinerary items have the correct foreign keys and
      cascading behavior.
- [ ] Test RLS policies for two different authenticated users.
- [ ] Configure local and production Supabase credentials securely.

## 3. Preference Engine

- [ ] Define the supported travel preferences (interests, pace, budget, and
      travel style).
- [ ] Add preference validation and persistence.
- [ ] Build preference input and editing in the frontend.
- [ ] Confirm preferences are applied only to the signed-in user's profile.
- [ ] Add tests for preference validation and updates.

## 4. Itinerary Generation

- [ ] Define the generation request and response contract.
- [ ] Generate itinerary suggestions from trip details and user preferences.
- [ ] Validate dates, ordering, locations, and estimated costs.
- [ ] Allow users to review, edit, reorder, and save generated items.
- [ ] Handle empty results, invalid input, provider failures, and retries.
- [ ] Add tests for generation and saved itinerary behavior.

## 5. Productization

- [ ] Implement and document the API endpoints in `API.md`.
- [ ] Complete authentication, authorization, and ownership checks.
- [ ] Add loading, empty, success, and error states in the frontend.
- [ ] Add input validation, accessibility, and responsive layouts.
- [ ] Configure production CORS, logging, and secret management.
- [ ] Review privacy, data retention, and third-party API requirements.

## 6. Deployment

- [ ] Configure the Render backend service and health check.
- [ ] Configure Supabase production credentials and database policies.
- [ ] Deploy the frontend to Vercel (or the optional Render static site).
- [ ] Set the production API base URL and frontend origin allowlist.
- [ ] Verify HTTPS, authentication, and key application flows in production.
- [ ] Document rollback and redeployment steps.

## 7. Testing

- [ ] Add unit tests for backend validation and business logic.
- [ ] Add API tests for success, validation, authentication, and authorization.
- [ ] Add frontend component and interaction tests.
- [ ] Test database constraints, cascading deletes, and RLS policies.
- [ ] Run linting, type checks (if configured), and production builds.
- [ ] Perform an end-to-end smoke test against a staging environment.
- [ ] Confirm no secrets or test data are exposed in production builds/logs.
