import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Calendar, Download, LoaderCircle, Share2, Wallet } from 'lucide-react';

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
  if (!value) return 'Not set';
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat(undefined, {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }).format(date);
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

function TripDetails({ accessToken }) {
  const { trip_id: tripId } = useParams();
  const [exportData, setExportData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    const fetchTrip = async () => {
      setIsLoading(true);
      setError('');
      setExportData(null);

      if (!tripId) {
        setError('A trip ID is required to load this itinerary.');
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `${API_BASE_URL}/api/trips/${encodeURIComponent(tripId)}/export`,
          {
            headers: {
              Accept: 'application/json',
              ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
            },
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          throw new Error(await getErrorMessage(response, `Could not load trip (${response.status}).`));
        }

        const data = await response.json();
        if (!data.trip || typeof data.formatted_summary !== 'string') {
          throw new Error('The trip export API returned an invalid response.');
        }
        setExportData(data);
      } catch (fetchError) {
        if (fetchError.name !== 'AbortError') {
          setError(fetchError instanceof Error ? fetchError.message : 'Could not load trip details.');
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };

    fetchTrip();
    return () => controller.abort();
  }, [accessToken, tripId]);

  useEffect(() => {
    if (!toast) return undefined;
    const timeoutId = window.setTimeout(() => setToast(''), 2600);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  const handleDownload = () => {
    if (!exportData?.formatted_summary) return;

    const blob = new Blob([exportData.formatted_summary], {
      type: 'text/plain;charset=utf-8',
    });
    const downloadUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = downloadUrl;
    anchor.download = 'itinerary.txt';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 0);
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setToast('Link Copied!');
    } catch {
      setToast('Could not copy the link. Check your browser permissions.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-64 items-center justify-center gap-3 text-sm text-slate-500" role="status">
        <LoaderCircle className="animate-spin text-emerald-700" size={20} aria-hidden="true" />
        Loading your itinerary…
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto mt-10 max-w-2xl rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700" role="alert">
        {error}
      </div>
    );
  }

  const trip = exportData.trip;
  const itineraryItems = Array.isArray(exportData.itinerary_items)
    ? exportData.itinerary_items
    : [];

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-md"
      >
        <div className="h-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
        <div className="p-6 sm:p-9">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-emerald-700">
                Your trip itinerary
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                {trip.title || trip.destination || 'Trip details'}
              </h1>
              {trip.title && trip.destination && trip.title !== trip.destination && (
                <p className="mt-2 text-base text-slate-600">{trip.destination}</p>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleShare}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <Share2 size={16} aria-hidden="true" />
                Share
              </button>
              <button
                type="button"
                onClick={handleDownload}
                disabled={!exportData.formatted_summary}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-emerald-700 px-3.5 text-sm font-medium text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download size={16} aria-hidden="true" />
                Download
              </button>
            </div>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-4">
              <span className="mt-0.5 text-emerald-700">
                <Calendar size={18} aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Travel dates</p>
                <p className="mt-1 text-sm font-medium text-slate-800">
                  {formatDate(trip.start_date)} – {formatDate(trip.end_date)}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-4">
              <span className="mt-0.5 text-emerald-700">
                <Wallet size={18} aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Budget</p>
                <p className="mt-1 text-sm font-medium text-slate-800">
                  {formatBudget(trip.budget, trip.currency || 'USD')}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-9">
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Itinerary overview</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {itineraryItems.length} {itineraryItems.length === 1 ? 'planned activity' : 'planned activities'}
                </p>
              </div>
            </div>

            <pre className="max-h-[560px] overflow-auto whitespace-pre-wrap rounded-2xl border border-slate-200 bg-slate-50 p-5 font-sans text-sm leading-7 text-slate-700 sm:p-6">
              {exportData.formatted_summary || 'No formatted summary is available yet.'}
            </pre>
          </div>
        </div>
      </motion.section>

      <AnimatePresence>
        {toast && (
          <motion.div
            role="status"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            className={`fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-xl px-4 py-3 text-sm font-medium shadow-lg ${
              toast === 'Link Copied!'
                ? 'bg-slate-900 text-white'
                : 'bg-red-700 text-white'
            }`}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

export default TripDetails;