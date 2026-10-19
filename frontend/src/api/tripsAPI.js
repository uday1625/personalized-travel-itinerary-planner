const TRIPS_API_URL = 'http://localhost:8000/api/trips';

export async function createTrip(tripData) {
  const response = await fetch(TRIPS_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(tripData),
  });

  const responseData = await response.json();

  if (!response.ok) {
    const message =
      responseData.detail ?? `Trip creation failed with status ${response.status}.`;
    throw new Error(message);
  }

  return responseData;
}