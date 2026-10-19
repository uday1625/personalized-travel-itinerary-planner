import { AnimatePresence, motion } from 'framer-motion';
import { Clock, MapPin, Moon, Sun, Sunset } from 'lucide-react';

const periods = [
  { key: 'morning', label: 'Morning', icon: Sun },
  { key: 'afternoon', label: 'Afternoon', icon: Sunset },
  { key: 'evening', label: 'Evening', icon: Moon },
];

function normalizeDayActivities(day) {
  if (Array.isArray(day.activities)) {
    return day.activities.map((activity) => ({
      ...activity,
      name: activity.activity_name ?? activity.name ?? 'Untitled activity',
      scheduled_time: activity.scheduled_time ?? activity.time ?? '',
    }));
  }

  return periods.flatMap(({ key, label }) =>
    (Array.isArray(day[key]) ? day[key] : []).map((activity) => ({
      ...activity,
      name: activity.activity_name ?? activity.name ?? 'Untitled activity',
      scheduled_time: activity.scheduled_time ?? activity.time ?? '',
      period: label,
    })),
  );
}

function ItineraryTimeline({ days = [] }) {
  if (!Array.isArray(days) || days.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
        Your itinerary will appear here once it has been generated.
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-10">
      <AnimatePresence initial={false}>
        {days.map((day, dayIndex) => {
          const activities = normalizeDayActivities(day).sort((first, second) =>
            first.scheduled_time.localeCompare(second.scheduled_time),
          );

          return (
            <motion.section
              key={day.day ?? dayIndex}
              aria-label={`Day ${day.day ?? dayIndex + 1} itinerary`}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-md sm:p-7"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35, delay: dayIndex * 0.06 }}
            >
              <div className="mb-6 flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-800">
                  {day.day ?? dayIndex + 1}
                </span>
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">
                    Day {day.day ?? dayIndex + 1}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {activities.length} {activities.length === 1 ? 'activity' : 'activities'}
                  </p>
                </div>
              </div>

              {activities.length === 0 ? (
                <p className="text-sm text-slate-500">No activities planned for this day.</p>
              ) : (
                <div className="relative space-y-4 before:absolute before:bottom-6 before:left-[19px] before:top-6 before:w-px before:bg-emerald-100">
                  <AnimatePresence initial={false}>
                    {activities.map((activity, activityIndex) => {
                      const PeriodIcon =
                        periods.find(({ label }) => label === activity.period)?.icon ?? Sun;

                      return (
                        <motion.article
                          key={`${day.day ?? dayIndex}-${activity.id ?? activity.name}-${activity.scheduled_time}-${activityIndex}`}
                          className="relative ml-1 rounded-xl border border-slate-100 bg-slate-50 p-4 shadow-sm sm:ml-2 sm:p-5"
                          initial={{ opacity: 0, y: 18 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.3, delay: activityIndex * 0.07 }}
                        >
                          <div className="flex items-start gap-3">
                            <span className="z-10 grid size-8 shrink-0 place-items-center rounded-full border border-emerald-100 bg-white text-emerald-700 shadow-sm">
                              <PeriodIcon size={16} aria-hidden="true" />
                            </span>
                            <div className="min-w-0 flex-1">
                              {activity.period && (
                                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-emerald-700">
                                  {activity.period}
                                </p>
                              )}
                              <h3 className="text-base font-semibold text-slate-900">
                                {activity.name}
                              </h3>
                              {activity.description && (
                                <p className="mt-1 text-sm leading-6 text-slate-600">
                                  {activity.description}
                                </p>
                              )}

                              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-500">
                                {activity.scheduled_time && (
                                  <span className="inline-flex items-center gap-1.5">
                                    <Clock size={15} aria-hidden="true" />
                                    {activity.scheduled_time}
                                  </span>
                                )}
                                {activity.location && (
                                  <span className="inline-flex items-center gap-1.5">
                                    <MapPin size={15} aria-hidden="true" />
                                    {activity.location}
                                  </span>
                                )}
                              </div>

                              <div className="mt-4 border-t border-slate-200/80 pt-3">
                                {activity.travel_time_to_next != null ? (
                                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                                    {activity.travel_time_to_next} min travel to next stop
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                                    End of day
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.article>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </motion.section>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

export default ItineraryTimeline;