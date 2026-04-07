import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { FeedbackBanner } from "@/components/ui/FeedbackBanner";
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

function formatNotificationKind(kind: string): string | null {
  if (kind === "community_post_created") return "New post";
  if (kind === "event_rsvp_created") return "RSVP";
  if (kind === "community_join_request_submitted") return "Join request";
  if (kind === "community_request_approved") return "Request approved";
  if (kind === "community_request_rejected") return "Request rejected";
  return null;
}

function readPayloadKind(payload: unknown): string | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const candidate = (payload as Record<string, unknown>).kind;
  if (typeof candidate !== "string" || candidate.trim().length === 0) {
    return null;
  }

  const kind = candidate.trim();
  if (kind !== "community_request_reviewed") {
    return kind;
  }

  const decision = (payload as Record<string, unknown>).decision;
  if (decision === "approve") return "community_request_approved";
  if (decision === "reject") return "community_request_rejected";
  return kind;
}

function getNotificationActionLabel(link: string): string {
  if (link.startsWith("/events/")) return "Open event";
  if (link.startsWith("/connect/communities/requests")) return "Review requests";
  if (link === "/connect/communities" || link.startsWith("/connect/communities?")) {
    return "Browse communities";
  }
  if (link.startsWith("/connect/communities/")) return "Open community";
  if (link.startsWith("/connect/my-communities?view=joined")) return "Open joined communities";
  if (link.startsWith("/connect/my-communities")) return "Open my communities";
  if (link.startsWith("/market/item/")) return "Open listing";
  if (link.startsWith("/profile/")) return "Open profile";
  return "Open update";
}

function toDisplayMessage(title: string, message: string): { primary: string; secondary: string | null } {
  const safeTitle = title.trim();
  const safeMessage = message.trim();

  if (!safeTitle && !safeMessage) {
    return { primary: "Notification update", secondary: null };
  }

  if (!safeMessage) {
    return { primary: safeTitle || "Notification update", secondary: null };
  }

  if (!safeTitle || safeTitle.toLowerCase() === safeMessage.toLowerCase()) {
    return { primary: safeMessage, secondary: null };
  }

  return { primary: safeMessage, secondary: safeTitle };
}

function shouldShowSecondary(
  secondary: string | null,
  contextLabel: string | null,
): boolean {
  if (!secondary) return false;
  if (!contextLabel) return true;

  const normalizedSecondary = secondary.trim().toLowerCase();
  const normalizedContext = contextLabel.trim().toLowerCase();

  return !normalizedSecondary.includes(normalizedContext);
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
        subtitle="Linked updates about events, communities, and activity that involves you."
        backHref="/profile"
      />
      {error ? <FeedbackBanner tone="error" message={error} /> : null}
      {loadError ? <FeedbackBanner tone="error" message={loadError} /> : null}

      <section className="wire-panel">
        <div className="mb-4 border-b border-wire-700 pb-3">
          <h2 className="wire-section-title">Recent updates</h2>
          <p className="mt-1 wire-meta">Open the linked page when you want more context or need to follow up.</p>
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
              const payloadKind = readPayloadKind(notification.payload);
              const contextLabel = payloadKind ? formatNotificationKind(payloadKind) : null;
              const display = toDisplayMessage(notification.title, notification.message);
              const showSecondary = shouldShowSecondary(display.secondary, contextLabel);
              const unread = !notification.is_read;

              return (
                <article
                  key={notification.id}
                  className={unread
                    ? "rounded-2xl border border-accent/35 bg-wire-800 px-3 py-3"
                    : "rounded-2xl border border-wire-700 bg-wire-800 px-3 py-3"}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex flex-wrap items-center gap-1.5">
                      <span className="rounded-full border border-wire-600 bg-wire-900 px-2 py-0.5 text-[11px] text-wire-300">
                        {formatNotificationType(notification.type)}
                      </span>
                      {contextLabel ? (
                        <span className="rounded-full border border-wire-700 bg-wire-900 px-2 py-0.5 text-[11px] text-wire-400">
                          {contextLabel}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      {unread ? (
                        <span className="rounded-full border border-accent/35 bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent">
                          Unread
                        </span>
                      ) : (
                        <span className="text-[11px] text-wire-500">Read</span>
                      )}
                      <span className="wire-meta whitespace-nowrap">
                        {formatNotificationTime(notification.created_at)}
                      </span>
                    </div>
                  </div>

                  {showSecondary ? (
                    <p className="mt-2 line-clamp-1 text-[12px] text-wire-400">{display.secondary}</p>
                  ) : null}
                  <p className="mt-1 text-[13px] leading-relaxed text-wire-100 [overflow-wrap:anywhere]">
                    {display.primary}
                  </p>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    {internalLink ? (
                      <Link href={internalLink} className="wire-link">
                        {getNotificationActionLabel(internalLink)}
                      </Link>
                    ) : (
                      <span className="text-[12px] text-wire-500">No linked page</span>
                    )}
                    {unread ? (
                      <form action={markNotificationReadAction}>
                          <input type="hidden" name="notificationId" value={notification.id} />
                          <input type="hidden" name="redirectTo" value={currentPageHref} />
                          <button type="submit" className="wire-action-compact">
                            Mark read
                          </button>
                      </form>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        ) : !loadError ? (
          <EmptyState
            title="No notifications yet"
            description="When events, communities, or requests involve you, the linked updates will appear here."
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
