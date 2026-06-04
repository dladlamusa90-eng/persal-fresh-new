"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
};

export default function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  const hasUnread = unreadCount > 0;

  const sortedNotifications = useMemo(
    () => [...notifications].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    [notifications]
  );

  async function loadNotifications() {
    try {
      const response = await fetch("/api/users/notifications", { cache: "no-store" });
      if (!response.ok) return;

      const body = (await response.json()) as {
        notifications?: NotificationItem[];
        unreadCount?: number;
      };

      setNotifications(body.notifications ?? []);
      setUnreadCount(body.unreadCount ?? 0);
    } catch {
      return;
    }
  }

  async function markAsRead(id: string) {
    // Virtual notifications cannot be marked as read in the database
    if (id.startsWith("virtual-")) return;

    try {
      const response = await fetch(`/api/users/notifications/${id}/read`, {
        method: "PATCH",
      });

      if (!response.ok) return;

      setNotifications((prev) =>
        prev.map((item) => (item.id === id ? { ...item, readAt: new Date().toISOString() } : item))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      return;
    }
  }

  async function markAllAsRead() {
    setIsMarkingAll(true);

    try {
      const response = await fetch("/api/users/notifications", {
        method: "PATCH",
      });

      if (!response.ok) return;

      const nowIso = new Date().toISOString();
      setNotifications((prev) => prev.map((item) => ({ ...item, readAt: item.readAt ?? nowIso })));
      setUnreadCount(0);
    } catch {
      return;
    } finally {
      setIsMarkingAll(false);
    }
  }

  async function openNotification(item: NotificationItem) {
    setSelectedNotification(item);

    if (!item.readAt) {
      await markAsRead(item.id);
      setSelectedNotification((prev) =>
        prev && prev.id === item.id ? { ...prev, readAt: new Date().toISOString() } : prev
      );
    }
  }

  useEffect(() => {
    loadNotifications();
    const intervalId = setInterval(loadNotifications, 4000);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="relative h-10 w-10 flex items-center justify-center rounded-full border border-gray-200 bg-white text-persal-dark hover:bg-teal-50"
        aria-label="Open notifications"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
          <path d="M9 17a3 3 0 0 0 6 0" />
        </svg>
        {hasUnread && (
          <span className="absolute -right-0.5 -top-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] leading-[18px] font-semibold text-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Mobile backdrop */}
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/40"
            onClick={() => setOpen(false)}
          />
        <div className="
          md:absolute md:right-0 md:mt-2 md:w-80 md:static-pos
          max-[767px]:fixed max-[767px]:top-1/2 max-[767px]:left-1/2 max-[767px]:-translate-x-1/2 max-[767px]:-translate-y-1/2 max-[767px]:w-[calc(100vw-32px)] max-[767px]:max-w-sm
          z-50 rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="px-3 py-2 border-b border-slate-200 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-900">Notifications</p>
            <button
              type="button"
              onClick={markAllAsRead}
              disabled={isMarkingAll || unreadCount === 0}
              className="text-[11px] font-semibold text-persal-blue hover:underline disabled:opacity-50 disabled:no-underline"
            >
              {isMarkingAll ? "Saving..." : "Mark all as read"}
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {sortedNotifications.length === 0 ? (
              <p className="px-3 py-4 text-sm text-slate-500">No notifications yet.</p>
            ) : (
              sortedNotifications.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => {
                    setOpen(false);
                    if (item.id === "virtual-bank-unverified") {
                      window.location.href = "/dashboard/profile?section=banking";
                      return;
                    }
                    openNotification(item);
                  }}
                  className={`w-full text-left px-3 py-3 border-b border-slate-100 hover:bg-slate-50 ${
                    item.readAt ? "bg-white" : "bg-amber-50/60"
                  }`}
                >
                  <p className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                    {item.id === "virtual-bank-unverified" && (
                      <svg className="h-3.5 w-3.5 text-amber-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <circle cx="12" cy="17" r="1" fill="currentColor" stroke="none" />
                      </svg>
                    )}
                    {item.title}
                  </p>
                  <p className="mt-1 text-xs text-slate-600 line-clamp-2">{item.body}</p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    {new Date(item.createdAt).toLocaleString("en-ZA", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </button>
              ))
            )}
          </div>
          <div className="px-3 py-2 text-right">
            <Link href="/dashboard/support" className="text-xs font-semibold text-persal-blue hover:underline">
              Open support
            </Link>
          </div>
        </div>
        </>
      )}

      {selectedNotification && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl border border-slate-200">
            <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">{selectedNotification.title}</h3>
                <div className="mt-1">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      selectedNotification.readAt
                        ? "bg-slate-100 text-slate-600"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {selectedNotification.readAt ? "Read" : "Unread"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {new Date(selectedNotification.createdAt).toLocaleString("en-ZA", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedNotification(null)}
                className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{selectedNotification.body}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
