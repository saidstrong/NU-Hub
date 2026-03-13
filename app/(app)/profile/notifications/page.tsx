import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageNavigation } from "@/components/ui/PageNavigation";
import { TopBar } from "@/components/ui/TopBar";
import { markAllNotificationsReadAction, markNotificationReadAction } from "@/lib/notifications/actions";
import {
  formatNotificationTime,
  getMyNotificationReadSummary,
  getMyNotificationsPage,
} from "@/lib/notifications/data";
import { buildPageHref, parsePageParam } from "@/lib/pagination";
import { isSafeInternalPath } from "@/lib/security/paths";

type NotificationsPageProps = {
  searchParams: Promise<{
    error?: string;
    page?: string;
  }>;
};

const NOTIFICATIONS_PAGE_SIZE = 20;

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
  const { error, page: pageParam } = await searchParams;
  const page = parsePageParam(pageParam);
  let notifications: Awaited<ReturnType<typeof getMyNotificationsPage>>["notifications"] = [];
  let hasMore = false;
  let unreadCount = 0;
  let totalCount = 0;
  let loadError: string | null = null;

  try {
    const [pagedNotifications, summary] = await Promise.all([
      getMyNotificationsPage(page, NOTIFICATIONS_PAGE_SIZE),
      getMyNotificationReadSummary(),
    ]);
    notifications = pagedNotifications.notifications;
    hasMore = pagedNotifications.hasMore;
    unreadCount = summary.unreadCount;
    totalCount = summary.totalCount;
  } catch (notificationsError) {
    loadError =
      notificationsError instanceof Error
        ? notificationsError.message
        : "Failed to load notifications.";
  }

  const previousHref = page > 1 ? buildPageHref("/profile/notifications", page - 1) : undefined;
  const nextHref = hasMore ? buildPageHref("/profile/notifications", page + 1) : undefined;
  const currentPageHref = buildPageHref("/profile/notifications", page);

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
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <p className="wire-meta">
              {totalCount === 0
                ? "No notifications yet."
                : unreadCount > 0
                  ? `${unreadCount} unread of ${totalCount}`
                  : `All caught up (${totalCount})`}
            </p>
            {unreadCount > 0 ? (
              <form action={markAllNotificationsReadAction}>
                <input type="hidden" name="redirectTo" value={currentPageHref} />
                <button type="submit" className="wire-action-compact">
                  Mark all read
                </button>
              </form>
            ) : null}
          </div>
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
                          <input type="hidden" name="redirectTo" value={currentPageHref} />
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
        <PageNavigation
          previousHref={previousHref}
          nextHref={nextHref}
          previousLabel="Previous page"
          nextLabel="Next page"
        />
      </section>
    </main>
  );
}
