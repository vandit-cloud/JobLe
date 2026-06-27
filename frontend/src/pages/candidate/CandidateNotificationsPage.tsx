import { useEffect, useState } from "react";
import {
  deleteCandidateNotification,
  deleteCandidateReadNotifications,
  fetchCandidateNotifications,
  markAllCandidateNotificationsRead,
  markCandidateNotificationRead,
  markCandidateNotificationUnread,
} from "../../api/recruiter";
import { EmptyState } from "../../components/common/EmptyState";
import { LoadingSkeleton } from "../../components/common/LoadingSkeleton";
import { PageHeader } from "../../components/common/PageHeader";
import { Pagination } from "../../components/common/Pagination";
import { useToast } from "../../context/ToastContext";
import { formatDateTime } from "../../lib/utils";
import type { CandidateNotification, PaginatedResponse } from "../../types";

export function CandidateNotificationsPage() {
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState("");
  const [read, setRead] = useState("");
  const [data, setData] = useState<PaginatedResponse<CandidateNotification> | null>(null);
  const { showToast } = useToast();

  function loadNotifications(nextPage = page, nextCategory = category, nextRead = read) {
    setLoading(true);
    fetchCandidateNotifications({
      page: nextPage,
      category: nextCategory || undefined,
      read: nextRead || undefined,
    })
      .then(setData)
      .catch(() => showToast("Unable to load notifications right now.", "error"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadNotifications(1, category, read);
  }, [category, read]);

  useEffect(() => {
    loadNotifications(page, category, read);
  }, [page]);

  async function runAction(action: () => Promise<unknown>, message: string) {
    try {
      await action();
      showToast(message, "success");
      loadNotifications(page, category, read);
    } catch {
      showToast("We couldn't update notifications right now.", "error");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Inbox"
        title="Notifications"
        description="Keep track of profile reminders, application movement, assessments, interviews, and privacy alerts."
        action={
          <>
            <button className="btn-secondary" onClick={() => runAction(markAllCandidateNotificationsRead, "All notifications marked as read.")} type="button">
              Mark all as read
            </button>
            <button className="btn-secondary" onClick={() => runAction(deleteCandidateReadNotifications, "Read notifications deleted.")} type="button">
              Delete read
            </button>
          </>
        }
      />

      <div className="glass-panel grid gap-4 p-5 md:grid-cols-3">
        <div>
          <label className="label" htmlFor="notification-category">
            Category
          </label>
          <input
            className="input"
            id="notification-category"
            onChange={(event) => {
              setPage(1);
              setCategory(event.target.value);
            }}
            placeholder="Search category"
            value={category}
          />
        </div>
        <div>
          <label className="label" htmlFor="notification-read">
            Read status
          </label>
          <select
            className="input"
            id="notification-read"
            onChange={(event) => {
              setPage(1);
              setRead(event.target.value);
            }}
            value={read}
          >
            <option value="">All</option>
            <option value="false">Unread</option>
            <option value="true">Read</option>
          </select>
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton className="h-80" />
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="No notifications found" description="You're all caught up for the current filters." />
      ) : (
        <div className="space-y-4">
          {data.items.map((notification) => (
            <div key={notification._id} className="glass-panel p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{notification.category}</span>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${notification.read ? "bg-slate-100 text-slate-700" : "bg-emerald-100 text-emerald-700"}`}>
                      {notification.read ? "Read" : "Unread"}
                    </span>
                  </div>
                  <h2 className="mt-3 text-lg font-bold text-ink">{notification.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{notification.message}</p>
                </div>
                <p className="text-xs font-medium text-slate-500">{formatDateTime(notification.createdAt)}</p>
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  className="btn-secondary"
                  onClick={() =>
                    runAction(
                      () => (notification.read ? markCandidateNotificationUnread(notification._id) : markCandidateNotificationRead(notification._id)),
                      notification.read ? "Notification marked as unread." : "Notification marked as read.",
                    )
                  }
                  type="button"
                >
                  {notification.read ? "Mark unread" : "Mark read"}
                </button>
                <button className="btn-danger" onClick={() => runAction(() => deleteCandidateNotification(notification._id), "Notification deleted.")} type="button">
                  Delete
                </button>
              </div>
            </div>
          ))}
          <Pagination onPageChange={setPage} page={page} totalPages={data.pagination.totalPages} />
        </div>
      )}
    </div>
  );
}
