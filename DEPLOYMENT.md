# Deployment

This guide deploys the Vite/React frontend to Vercel and the FastAPI backend to
Render. Deploy the backend first so you can configure the frontend with its
public URL.

## Prerequisites

- A GitHub repository containing the project.
- A Supabase project and the database schema applied from
  [`database/schema.sql`](./database/schema.sql).
- Accounts on [Render](https://render.com/) and [Vercel](https://vercel.com/).

## Deploy the backend to Render

1. Push the project to GitHub.
2. In Render, choose **New +** → **Blueprint** and select the repository.
   Render will read the root `render.yaml` and create the API service.
3. Set the requested `SUPABASE_URL` and `SUPABASE_KEY` environment variables
   in the Render dashboard. Use the appropriate Supabase key for the backend;
   never expose a service-role key to the browser.
4. Wait for the deploy to complete, then check
   `https://<your-render-service>.onrender.com/health`. Expect
   `{"status":"healthy"}`.
5. Record the API's public URL. Configure the backend's allowed CORS origins
   to include the Vercel frontend origin before using browser API requests.

The Blueprint uses `backend` as the service root, installs FastAPI and Uvicorn,
and starts `main:app` on Render's assigned port. Add any new backend
dependencies to a requirements file and update the Render build command as the
application grows.

## Deploy the frontend to Vercel

1. In Vercel, choose **Add New** → **Project** and import the GitHub repository.
2. Set the **Root Directory** to `frontend`.
3. Use the following build settings (Vercel usually detects these
   automatically):
   - Framework preset: **Vite**
   - Build command: `npm run build`
   - Output directory: `dist`
4. Add `VITE_API_BASE_URL` with the Render backend URL, for example
   `https://<your-render-service>.onrender.com`. Add any other required
   `VITE_` settings in Vercel; values prefixed with `VITE_` are public in the
   built browser application.
5. Deploy and open the generated Vercel URL. Confirm the page loads and, once
   API routes are implemented, that browser requests reach the backend.
6. Add the Vercel production domain to the backend's allowed CORS origins and
   redeploy the backend.

## Supabase configuration

Apply the schema in the Supabase SQL Editor if it has not already been applied.
Keep backend credentials in Render environment settings and local credentials
in `backend/.env`. Do not commit `.env` files or put a service-role key in
Vercel or frontend source.

## Deployment notes

- The current FastAPI starter has `/` and `/health`; the `/api` routes described
  in [`API.md`](./API.md) are planned and need implementation.
- The current backend CORS setup is permissive for local scaffolding. Replace
  it with an explicit allowlist of deployed frontend origins before production
  use.
- Confirm the database RLS policies and authentication flow with a real
  authenticated user before storing production data.
