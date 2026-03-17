import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/ui/EmptyState";
import { TopBar } from "@/components/ui/TopBar";
import { formatCampusMessageTimestamp } from "@/lib/datetime";
import { approveEventAction, rejectEventAction } from "@/lib/events/actions";
import { formatEventDate, getPendingEventsForReview } from "@/lib/events/data";
import {
  resolveContentReportAction,
  setContentHiddenAction,
} from "@/lib/moderation/actions";
import {
  getRecentContentReports,
  isAdminUser,
  requireAdminUser,
} from "@/lib/moderation/data";

type ModerationPageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
};

function formatReasonLabel(reason: string): string {
  return reason
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatTargetTypeLabel(targetType: string): string {
  if (targetType === "community_post") return "Community post";
  if (targetType === "community") return "Community";
  if (targetType === "event") return "Event";
  return "Listing";
}

function formatReportTime(createdAt: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(createdAt));
}

function formatPendingCreatedTime(createdAt: string): string {
  return formatCampusMessageTimestamp(createdAt);
}

export default async function ModerationPage({ searchParams }: ModerationPageProps) {
  const { error, message } = await searchParams;
  const adminUser = await requireAdminUser();

  if (!isAdminUser(adminUser)) {
    notFound();
  }

  let reports: Awaited<ReturnType<typeof getRecentContentReports>> = [];
  let pendingEvents: Awaited<ReturnType<typeof getPendingEventsForReview>> = [];
  let loadError: string | null = null;
  let pendingLoadError: string | null = null;

  try {
    reports = await getRecentContentReports(80);
  } catch (reportLoadError) {
    loadError =
      reportLoadError instanceof Error
        ? reportLoadError.message
        : "Failed to load moderation reports.";
  }

  try {
    pendingEvents = await getPendingEventsForReview(80);
  } catch (eventLoadError) {
    pendingLoadError =
      eventLoadError instanceof Error
        ? eventLoadError.message
        : "Failed to load pending event submissions.";
  }

  return (
    <main>
      <TopBar
        title="Moderation"
        subtitle="Recent reports and basic visibility controls"
        backHref="/profile"
      />
      {message ? (
        <div className="rounded-xl border border-accent/35 bg-accent/10 px-3 py-2 text-[13px] text-wire-100">
          {message}
        </div>
      ) : null}
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
      {pendingLoadError ? (
        <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-[13px] text-red-200">
          {pendingLoadError}
        </div>
      ) : null}

      <section className="wire-panel">
        <div className="mb-3 border-b border-wire-700 pb-3">
          <h2 className="wire-section-title">Pending event approvals</h2>
          <p className="mt-1 wire-meta">Review submitted events before public visibility.</p>
          <p className="mt-2 wire-meta">
            {pendingEvents.length > 0 ? `${pendingEvents.length} pending` : "No pending events"}
          </p>
        </div>

        {pendingEvents.length > 0 ? (
          <div className="space-y-2.5">
            {pendingEvents.map((event) => (
              <article
                key={event.id}
                className="rounded-2xl border border-wire-700 bg-wire-800 px-3 py-3"
              >
                <p className="text-sm font-medium text-wire-100">{event.title}</p>
                <div className="mt-2 space-y-1">
                  <p className="wire-meta">Category: {event.category}</p>
                  <p className="wire-meta">Schedule: {formatEventDate(event.startsAt, event.endsAt)}</p>
                  <p className="wire-meta">Location: {event.location}</p>
                  <p className="wire-meta">Submitted by: {event.creatorName}</p>
                  <p className="wire-meta">Submitted at: {formatPendingCreatedTime(event.createdAt)}</p>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Link href={`/events/${event.id}`} className="wire-action-compact">
                    Open event
                  </Link>
                  <form action={approveEventAction}>
                    <input type="hidden" name="eventId" value={event.id} />
                    <input type="hidden" name="redirectTo" value="/profile/moderation" />
                    <button type="submit" className="wire-action-compact">
                      Approve
                    </button>
                  </form>
                  <form action={rejectEventAction}>
                    <input type="hidden" name="eventId" value={event.id} />
                    <input type="hidden" name="redirectTo" value="/profile/moderation" />
                    <button type="submit" className="wire-action-compact">
                      Reject
                    </button>
                  </form>
                </div>
              </article>
            ))}
          </div>
        ) : !pendingLoadError ? (
          <EmptyState
            title="No pending event submissions"
            description="New event submissions will appear here for approval."
            actionLabel="Back to profile"
            actionHref="/profile"
          />
        ) : null}
      </section>

      <section className="wire-panel">
        <div className="mb-3 border-b border-wire-700 pb-3">
          <h2 className="wire-section-title">Recent reports</h2>
          <p className="mt-1 wire-meta">Review reports and toggle target visibility when needed.</p>
          <p className="mt-2 wire-meta">
            {reports.length > 0 ? `${reports.length} report(s)` : "No reports"}
          </p>
        </div>

        {reports.length > 0 ? (
          <div className="space-y-2.5">
            {reports.map((report) => {
              const nextHiddenValue = report.targetHidden ? "false" : "true";
              const hideLabel = report.targetHidden ? "Unhide content" : "Hide content";

              return (
                <article
                  key={report.id}
                  className="rounded-2xl border border-wire-700 bg-wire-800 px-3 py-3"
                >
                  <p className="text-sm font-medium text-wire-100">
                    {formatTargetTypeLabel(report.targetType)}
                  </p>
                  <p className="mt-1 text-sm text-wire-200">{report.targetLabel}</p>
                  <div className="mt-2 space-y-1">
                    <p className="wire-meta">
                      Reported by {report.reporterName} - {formatReportTime(report.createdAt)}
                    </p>
                    <p className="wire-meta">Reason: {formatReasonLabel(report.reason)}</p>
                    <p className="wire-meta">
                      Status:{" "}
                      {report.targetHidden === null
                        ? "Target removed"
                        : report.targetHidden
                          ? "Hidden"
                          : "Visible"}
                    </p>
                    {report.note ? <p className="wire-meta">Note: {report.note}</p> : null}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {report.targetLink ? (
                      <Link href={report.targetLink} className="wire-action-compact">
                        Open target
                      </Link>
                    ) : null}
                    {report.targetExists && report.targetHidden !== null ? (
                      <form action={setContentHiddenAction}>
                        <input type="hidden" name="targetType" value={report.targetType} />
                        <input type="hidden" name="targetId" value={report.targetId} />
                        <input type="hidden" name="isHiddenInput" value={nextHiddenValue} />
                        <input type="hidden" name="redirectTo" value="/profile/moderation" />
                        <button type="submit" className="wire-action-compact">
                          {hideLabel}
                        </button>
                      </form>
                    ) : null}
                    <form action={resolveContentReportAction}>
                      <input type="hidden" name="reportId" value={report.id} />
                      <input type="hidden" name="redirectTo" value="/profile/moderation" />
                      <button type="submit" className="wire-action-compact">
                        Resolve
                      </button>
                    </form>
                  </div>
                </article>
              );
            })}
          </div>
        ) : !loadError ? (
          <EmptyState
            title="No reports yet"
            description="New reports will appear here for internal review."
            actionLabel="Back to profile"
            actionHref="/profile"
          />
        ) : null}
      </section>
    </main>
  );
}
