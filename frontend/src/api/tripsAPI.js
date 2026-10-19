// Ye line .env file se URL uthayegi
const BASE_URL = "https://personalized-travel-itinerary-planner-e1j6.onrender.com";

// Fetch call aise honi chahiye:
export const createTrip = async (tripData) => {
    const response = await fetch(`${BASE_URL}/api/trips`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tripData),
    });
    return response.json();
};