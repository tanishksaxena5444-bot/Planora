import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";

const DAYS = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
];

function formatHours(seconds) {
  const hours = (Number(seconds) || 0) / 3600;

  if (hours === 0) return "0h";

  if (hours < 1) {
    return `${Math.round(hours * 60)}m`;
  }

  return `${hours.toFixed(1)}h`;
}

function getMaxValue(days) {
  const highest = Math.max(
    ...days.map((day) => Number(day.seconds || 0))
  );

  if (highest <= 0) return 4;

  return Math.max(4, Math.ceil(highest / 3600));
}

export default function ActivityStatistics() {
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const response = await api.getWeeklyActivity();

        if (cancelled) return;

        setDays(
          Array.isArray(response?.days)
            ? response.days
            : []
        );
      } catch (err) {
        if (!cancelled) {
          console.error(
            "Failed to load activity statistics:",
            err
          );

          setError(
            err.message ||
              "Unable to load activity statistics."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    const totalSeconds = days.reduce(
      (sum, day) =>
        sum + Number(day.seconds || 0),
      0
    );

    const activeDays = days.filter(
      (day) => Number(day.seconds || 0) > 0
    ).length;

    const average =
      activeDays > 0
        ? totalSeconds / activeDays
        : 0;

    const mostActive = days.reduce(
      (best, day) =>
        Number(day.seconds || 0) >
        Number(best?.seconds || 0)
          ? day
          : best,
      null
    );

    return {
      totalSeconds,
      average,
      mostActive,
    };
  }, [days]);

  const maxHours = getMaxValue(days);

  if (loading) {
    return (
      <section className="glass-panel rounded-2xl p-5 mb-4">
        <p className="section-kicker">
          Activity statistics
        </p>

        <p className="text-sm text-paper-dim mt-2">
          Loading weekly activity…
        </p>
      </section>
    );
  }

  return (
    <section className="glass-panel rounded-2xl p-5 mb-4 activity-statistics">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
        <div>
          <p className="section-kicker">
            Activity statistics
          </p>

          <h2 className="font-display text-2xl">
            Your work this week
          </h2>

          <p className="text-xs text-paper-dim mt-1">
            Actual time recorded from your work sessions.
          </p>
        </div>

        {error && (
          <span className="text-xs text-blocked">
            {error}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-7">
        <ActivityMiniStat
          label="This week"
          value={formatHours(stats.totalSeconds)}
        />

        <ActivityMiniStat
          label="Daily average"
          value={formatHours(stats.average)}
        />

        <ActivityMiniStat
          label="Most active"
          value={
            stats.mostActive?.seconds > 0
              ? `${stats.mostActive.label} · ${formatHours(
                  stats.mostActive.seconds
                )}`
              : "No activity"
          }
        />
      </div>

      <div className="activity-chart">
        <div className="activity-y-axis">
          <span>{maxHours}h</span>
          <span>{Math.round(maxHours * 0.75)}h</span>
          <span>{Math.round(maxHours * 0.5)}h</span>
          <span>{Math.round(maxHours * 0.25)}h</span>
          <span>0h</span>
        </div>

        <div className="activity-bars">
          <div className="activity-gridlines">
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>

          {DAYS.map((label) => {
            const day =
              days.find(
                (item) => item.label === label
              ) || {
                label,
                seconds: 0,
              };

            const seconds = Number(
              day.seconds || 0
            );

            const hours = seconds / 3600;

            const height = Math.min(
              100,
              (hours / maxHours) * 100
            );

            return (
              <div
                key={label}
                className="activity-bar-column"
              >
                <div className="activity-bar-value">
                  {seconds > 0
                    ? formatHours(seconds)
                    : ""}
                </div>

                <div className="activity-bar-track">
                  <div
                    className="activity-bar-fill"
                    style={{
                      height: `${height}%`,
                    }}
                    title={`${label}: ${formatHours(
                      seconds
                    )}`}
                  />
                </div>

                <span className="activity-day">
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function ActivityMiniStat({ label, value }) {
  return (
    <div className="metric-mini">
      <p className="section-kicker">
        {label}
      </p>

      <p className="font-display text-2xl mt-1">
        {value}
      </p>
    </div>
  );
}