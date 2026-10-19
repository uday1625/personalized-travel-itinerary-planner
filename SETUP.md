# Local Setup

## Prerequisites

- Git
- Python 3.10 or newer
- Node.js 20 or newer and npm
- A Supabase project for database and authentication setup

## 1. Clone the repository

```powershell
git clone https://github.com/uday1625/personalized-travel-itinerary-planner.git
cd personalized-travel-itinerary-planner
```

## 2. Configure Supabase

1. Create a Supabase project and copy its project URL and anon/publishable key.
2. In the Supabase SQL Editor, run the contents of
   [`database/schema.sql`](./database/schema.sql).
3. Keep any privileged service-role key on the backend only. Never use it in
   frontend code or a `VITE_` environment variable.

## 3. Set up the FastAPI backend

From the repository root, create and activate a virtual environment:

```powershell
py -m venv backend\venv
.\backend\venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install fastapi "uvicorn[standard]"
```

If PowerShell blocks activation, you can invoke the virtual environment's
Python directly with `.\backend\venv\Scripts\python.exe`.

Create the backend environment file:

```powershell
Copy-Item backend\.env.example backend\.env
```

Edit `backend/.env` and set `SUPABASE_URL` and `SUPABASE_KEY` to your project
values. Do not commit this file.

Start the API from the repository root:

```powershell
python -m uvicorn main:app --reload --app-dir backend
```

The API is available at `http://127.0.0.1:8000`. Check
`http://127.0.0.1:8000/health` for the health response.

## 4. Set up the React frontend

In a second terminal, install dependencies and create the local environment
file:

```powershell
cd frontend
npm install
Copy-Item .env.example .env
```

Set the values in `frontend/.env` as needed. Add
`VITE_API_BASE_URL=http://127.0.0.1:8000` when the frontend is configured to
call the API. Vite variables are included in the browser bundle: use only
public values such as a Supabase anon/publishable key, never a service-role
key.

Start the development server:

```powershell
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`.

## Current scaffold

The backend currently includes only the root and health endpoints; the planner
API and Supabase client integration are not implemented yet. The values in the
environment examples document configuration placeholders and are not
automatically loaded by the current FastAPI starter.
