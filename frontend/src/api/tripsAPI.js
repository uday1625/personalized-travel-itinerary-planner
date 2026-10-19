// Ye line backend URL ko .env file se uthayegi. 
// Agar .env mein nahi mila, toh local testing ke liye localhost use karega.
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// Example: Create Trip API
export const createTrip = async (tripData) => {
    const response = await fetch(`${BASE_URL}/api/trips`, {
        method: "POST",
        headers: { 
            "Content-Type": "application/json" 
        },
        body: JSON.stringify(tripData),
    });
    
    if (!response.ok) {
        throw new Error("Failed to create trip");
    }
    return response.json();
};

// Example: Get Trips API
export const getTrips = async () => {
    const response = await fetch(`${BASE_URL}/api/trips`);
    return response.json();
};