# Create a FastAPI application with CORS middleware, a root endpoint, and a health check endpoint
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware  

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Travel Itinerary Backend is running!"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}
