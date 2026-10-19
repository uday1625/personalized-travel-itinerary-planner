from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# YE LINE BAHUT ZAROORI HAI
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Local testing ke liye
        "https://personalized-travel-itinerary-planner.vercel.app" # 👈 YAHAN APNA ACTUAL VERCEL URL DAALO (https:// ke sath, bina slash ke)
    ],
    allow_credentials=True,
    allow_methods=["*"], # GET, POST, PUT, DELETE sab allow karega
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Backend is LIVE on Render!"}

# ... baaki ka code (routers include karna) ...