import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);

  async function loadNotifications() {
    try {
      const response = await api.getNotifications();

      setNotifications(
        Array.isArray(response.notifications)
          ? response.notifications
          : []
      );
    } catch (error) {
      console.error(
        "Failed to load notifications:",
        error
      );
    }
  }

  useEffect(() => {
    loadNotifications();

    const interval = setInterval(
      loadNotifications,
      30000
    );

    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter(
    (notification) => !notification.read
  ).length;

  async function handleRead(notification) {
    try {
      await api.markNotificationRead(notification._id);

      setNotifications((current) =>
        current.map((item) =>
          item._id === notification._id
            ? { ...item, read: true }
            : item
        )
      );
    } catch (error) {
      console.error(
        "Failed to mark notification read:",
        error
      );
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="theme-toggle relative"
        aria-label="Notifications"
      >
        🔔

        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 min-w-5 h-5 px-1 rounded-full bg-blocked text-white text-[10px] flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] z-50 app-card rounded-xl border border-line shadow-xl overflow-hidden">
          <div className="p-4 border-b border-line">
            <p className="section-kicker">
              Notifications
            </p>

            <h3 className="font-display text-xl">
              Your updates
            </h3>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {!notifications.length && (
              <p className="p-4 text-sm text-paper-dim">
                You're all caught up.
              </p>
            )}

            {notifications.map((notification) => (
              <div
                key={notification._id}
                className={`p-4 border-b border-line ${
                  notification.read
                    ? ""
                    : "bg-progress/5"
                }`}
              >
                <p className="font-medium text-sm">
                  {notification.title}
                </p>

                <p className="text-xs text-paper-dim mt-1">
                  {notification.message}
                </p>

                {notification.project && (
                  <Link
                    to={`/projects/${notification.project._id}`}
                    onClick={() =>
                      handleRead(notification)
                    }
                    className="text-progress text-xs mt-2 inline-block"
                  >
                    Open project →
                  </Link>
                )}

                {!notification.read && (
                  <button
                    type="button"
                    onClick={() =>
                      handleRead(notification)
                    }
                    className="text-xs text-paper-dim ml-3"
                  >
                    Mark read
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}