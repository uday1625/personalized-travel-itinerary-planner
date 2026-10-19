from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "Travel Itinerary Backend is running on Render!"}