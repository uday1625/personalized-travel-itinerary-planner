import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Calendar, LoaderCircle, Trash2, Wallet } from 'lucide-react';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');

async function getErrorMessage(response, fallback) {
  try {
    const body = await response.json();
    return body.detail || fallback;
  } catch {
    return fallback;
  }
}

function formatDate(value) {
  if (!value) return 'Date not set';
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

function formatBudget(value, currency = 'USD') {
  if (value == null || value === '') return 'Not set';
  const amount = Number(value);
  if (!Number.isFinite(amount)) return String(value);

  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

function TripHistory({ accessToken }) {
  const [trips, setTrips] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingTripId, setDeletingTripId] = useState(null);

  const fetchTrips = useCallback(async (signal) => {
    const response = await fetch(`${API_BASE_URL}/api/trips`, {
      headers: {
        Accept: 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      signal,
    });

    if (!response.ok) {
      throw new Error(await getErrorMessage(response, `Could not load trips (${response.status}).`));
    }

    const data = await response.json();
    if (!Array.isArray(data)) {
      throw new Error('The trips API returned an invalid response.');
    }
    return data;
  }, [accessToken]);

  useEffect(() => {
    const controller = new AbortController();

    fetchTrips(controller.signal)
      .then((data) => {
        setTrips(data);
        setError('');
      })
      .catch((fetchError) => {
        if (fetchError.name !== 'AbortError') {
          setError(fetchError instanceof Error ? fetchError.message : 'Could not load trips.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [fetchTrips]);

  const handleDelete = async (tripId) => {
    setDeletingTripId(tripId);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/trips/${encodeURIComponent(tripId)}`, {
        method: 'DELETE',
        headers: {
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      });

      if (!response.ok) {
        throw new Error(await getErrorMessage(response, `Could not delete trip (${response.status}).`));
      }

      setTrips((currentTrips) =>
        currentTrips.filter((trip) => String(trip.trip_id ?? trip.id) !== String(tripId)),
      );
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Could not delete trip.');
    } finally {
      setDeletingTripId(null);
    }
  };

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8" aria-labelledby="trip-history-title">
      <header className="mb-7 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-emerald-700">
            Your travel journal
          </p>
          <h1 id="trip-history-title" className="text-3xl font-semibold tracking-tight text-slate-900">
            Your trips
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Revisit your plans and keep every getaway in one place.
          </p>
        </div>
        {!isLoading && !error && (
          <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-800">
            {trips.length} {trips.length === 1 ? 'trip' : 'trips'}
          </span>
        )}
      </header>

      {error && (
        <div
          className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          <span>{error}</span>
          {isLoading && <LoaderCircle className="animate-spin" size={17} aria-label="Loading trips" />}
        </div>
      )}

      {isLoading && (
        <div className="flex min-h-48 items-center justify-center gap-3 text-sm text-slate-500" role="status">
          <LoaderCircle className="animate-spin text-emerald-700" size={20} aria-hidden="true" />
          Loading your trips…
        </div>
      )}

      {!isLoading && !error && trips.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center shadow-sm">
          <span className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-emerald-50 text-emerald-700">
            <Calendar size={22} aria-hidden="true" />
          </span>
          <h2 className="text-lg font-semibold text-slate-900">No trips yet</h2>
          <p className="mt-1 text-sm text-slate-500">Your saved travel plans will show up here.</p>
        </div>
      )}

      {!isLoading && trips.length > 0 && (
        <motion.div layout className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence initial={false}>
            {trips.map((trip, index) => {
              const tripId = trip.trip_id ?? trip.id;
              const isDeleting = String(deletingTripId) === String(tripId);

              return (
                <motion.article
                  key={tripId}
                  layout
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: -8 }}
                  transition={{ duration: 0.28, delay: Math.min(index * 0.06, 0.3) }}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
                  <div className="p-5">
                    <div className="mb-5 flex items-start justify-between gap-3">
                      <div>
                        <p className="mb-1 text-xs font-medium uppercase tracking-wider text-slate-400">
                          Destination
                        </p>
                        <h2 className="text-xl font-semibold text-slate-900">
                          {trip.destination || 'Untitled destination'}
                        </h2>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDelete(tripId)}
                        disabled={isDeleting || tripId == null}
                        aria-label={`Delete trip to ${trip.destination || 'destination'}`}
                        className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isDeleting ? (
                          <LoaderCircle className="animate-spin" size={17} aria-hidden="true" />
                        ) : (
                          <Trash2 size={17} aria-hidden="true" />
                        )}
                      </button>
                    </div>

                    <div className="space-y-3 border-t border-slate-100 pt-4">
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 text-emerald-700">
                          <Calendar size={17} aria-hidden="true" />
                        </span>
                        <div>
                          <p className="text-xs font-medium text-slate-400">Travel dates</p>
                          <p className="mt-0.5 text-sm font-medium text-slate-700">
                            {formatDate(trip.start_date)}
                            {trip.end_date && ` – ${formatDate(trip.end_date)}`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 text-emerald-700">
                          <Wallet size={17} aria-hidden="true" />
                        </span>
                        <div>
                          <p className="text-xs font-medium text-slate-400">Budget</p>
                          <p className="mt-0.5 text-sm font-medium text-slate-700">
                            {formatBudget(trip.budget, trip.currency || 'USD')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}
    </section>
  );
}

export default TripHistory;