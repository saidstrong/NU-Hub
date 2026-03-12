import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { TopBar } from "@/components/ui/TopBar";
import { markNotificationReadAction } from "@/lib/notifications/actions";
import {
  formatNotificationTime,
  getMyNotifications,
} from "@/lib/notifications/data";
import { isSafeInternalPath } from "@/lib/security/paths";

type NotificationsPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

function formatNotificationType(type: "market" | "events" | "community" | "system"): string {
  if (type === "events") return "Event";
  if (type === "community") return "Community";
  if (type === "market") return "Market";
  return "System";
}

function toInternalLink(link: string | null): string | null {
  return isSafeInternalPath(link) ? link.trim() : null;
}

export default async function NotificationsPage({ searchParams }: NotificationsPageProps) {
  const { error } = await searchParams;
  let notifications: Awaited<ReturnType<typeof getMyNotifications>> = [];
  let loadError: string | null = null;

  try {
    notifications = await getMyNotifications();
  } catch (notificationsError) {
    loadError =
      notificationsError instanceof Error
        ? notificationsError.message
        : "Failed to load notifications.";
  }

  return (
    <main>
      <TopBar
        title="Notifications"
        subtitle="Recent updates related to your profile and activity"
        backHref="/profile"
      />
      {error ? (
        <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-[13px] text-red-200">
          {error}
        </div>
      ) : null}
      {loadError ? (
        <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-[13px] text-red-200">
          {loadError}
        </div>
      ) : null}

      <section className="wire-panel">
        <div className="mb-4 border-b border-wire-700 pb-3">
          <h2 className="wire-section-title">Recent activity</h2>
          <p className="mt-1 wire-meta">In-app updates for communities and events.</p>
        </div>

        {notifications.length > 0 ? (
          <div className="space-y-2.5">
            {notifications.map((notification) => {
              const internalLink = toInternalLink(notification.link);

              return (
                <article
                  key={notification.id}
                  className="rounded-2xl border border-wire-700 bg-wire-800 px-3 py-3"
                >
                  <p className="text-sm font-medium text-wire-100">{notification.title}</p>
                  <p className="mt-1 text-sm text-wire-200">{notification.message}</p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <p className="wire-meta">{formatNotificationTime(notification.created_at)}</p>
                    <div className="flex items-center gap-2">
                      <span className="rounded-xl border border-wire-600 bg-wire-900 px-2 py-1 text-[12px] text-wire-300">
                        {formatNotificationType(notification.type)}
                      </span>
                      {!notification.is_read ? (
                        <form action={markNotificationReadAction}>
                          <input type="hidden" name="notificationId" value={notification.id} />
                          <input type="hidden" name="redirectTo" value="/profile/notifications" />
                          <button type="submit" className="wire-action-compact">
                            Mark read
                          </button>
                        </form>
                      ) : (
                        <span className="rounded-xl border border-accent/30 bg-accent/10 px-2 py-1 text-[12px] text-wire-200">
                          Read
                        </span>
                      )}
                    </div>
                  </div>
                  {internalLink ? (
                    <div className="mt-2">
                      <Link href={internalLink} className="wire-link">
                        Open related page
                      </Link>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : !loadError ? (
          <EmptyState
            title="No notifications yet"
            description="New activity updates will appear here."
            actionLabel="Back to profile"
            actionHref="/profile"
          />
        ) : null}
      </section>
    </main>
  );
}
