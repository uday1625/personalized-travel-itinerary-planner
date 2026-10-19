import { BrowserRouter, Route, Routes } from 'react-router-dom';
import TripHistory from './components/TripHistory';
import TripDetails from './components/TripDetails';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <div className="App">
              <header className="hero-section">
                <h1>Personalized Travel Itinerary Planner</h1>
                <p>Plan your perfect trip with ease and convenience.</p>
              </header>

              <TripHistory />

              <section className="features">
                <h2>Features</h2>
                <ul>
                  <li>Customizable itineraries based on your preferences</li>
                  <li>Integration with popular travel APIs for real-time data</li>
                  <li>User-friendly interface for easy planning</li>
                  <li>Save and share your itineraries with friends and family</li>
                </ul>
              </section>

              <footer className="footer">
                <p>&copy; 2024 Personalized Travel Itinerary Planner. All rights reserved.</p>
              </footer>
            </div>
          }
        />
        <Route path="/trip/:trip_id" element={<TripDetails />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App; 
