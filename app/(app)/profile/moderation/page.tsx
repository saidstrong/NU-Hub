import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/ui/EmptyState";
import { TopBar } from "@/components/ui/TopBar";
import { isFeatureEnabled } from "@/lib/config/features";
import { formatCampusMessageTimestamp } from "@/lib/datetime";
import {
  clearCommunityFormalStatusAction,
  setCommunityFormalKindAction,
} from "@/lib/connect/actions";
import { getCommunitiesForCuration } from "@/lib/connect/data";
import { approveEventAction, rejectEventAction } from "@/lib/events/actions";
import { formatEventDate, getPendingEventsForReview } from "@/lib/events/data";
import { setListingFeaturedAction } from "@/lib/market/actions";
import {
  formatCompactListingPrice,
  formatListingTypeLabel,
  formatStatusLabel,
  getFeaturedListingsForReview,
} from "@/lib/market/data";
import {
  approveJobAction,
  rejectJobAction,
  setJobHiddenAction,
} from "@/lib/jobs/actions";
import {
  formatJobLocationModeLabel,
  formatJobTypeLabel,
  getPendingJobsForReview,
} from "@/lib/jobs/data";
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

function formatFormalKindLabel(formalKind: "club" | "organization" | "official" | null): string {
  if (formalKind === "club") return "Club";
  if (formalKind === "organization") return "Organization";
  if (formalKind === "official") return "Official";
  return "No trust label";
}

export default async function ModerationPage({ searchParams }: ModerationPageProps) {
  const { error, message } = await searchParams;
  const adminUser = await requireAdminUser();
  const jobsFeatureEnabled = isFeatureEnabled("jobsBoard");

  if (!isAdminUser(adminUser)) {
    notFound();
  }

  let reports: Awaited<ReturnType<typeof getRecentContentReports>> = [];
  let pendingEvents: Awaited<ReturnType<typeof getPendingEventsForReview>> = [];
  let pendingJobs: Awaited<ReturnType<typeof getPendingJobsForReview>> = [];
  let listingsForFeature: Awaited<ReturnType<typeof getFeaturedListingsForReview>> = [];
  let communitiesForCuration: Awaited<ReturnType<typeof getCommunitiesForCuration>> = [];
  let loadError: string | null = null;
  let pendingLoadError: string | null = null;
  let jobsLoadError: string | null = null;
  let listingsLoadError: string | null = null;
  let communityCurationLoadError: string | null = null;

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

  if (jobsFeatureEnabled) {
    try {
      pendingJobs = await getPendingJobsForReview(80);
    } catch (jobLoadIssue) {
      jobsLoadError =
        jobLoadIssue instanceof Error
          ? jobLoadIssue.message
          : "Failed to load pending job submissions.";
    }
  }

  try {
    listingsForFeature = await getFeaturedListingsForReview(80);
  } catch (listingLoadError) {
    listingsLoadError =
      listingLoadError instanceof Error
        ? listingLoadError.message
        : "Failed to load listings for featuring.";
  }

  try {
    communitiesForCuration = await getCommunitiesForCuration(80);
  } catch (curationLoadError) {
    communityCurationLoadError =
      curationLoadError instanceof Error
        ? curationLoadError.message
        : "Failed to load communities for curation.";
  }

  const pendingEventsCount = pendingEvents.length;
  const pendingJobsCount = pendingJobs.length;
  const featuredListingsCount = listingsForFeature.filter((listing) => listing.isFeatured).length;
  const formalCommunitiesCount = communitiesForCuration.filter(
    (community) => community.communityType === "formal",
  ).length;
  const reportsCount = reports.length;
  const summaryGridClass = jobsFeatureEnabled
    ? "grid gap-2 sm:grid-cols-5"
    : "grid gap-2 sm:grid-cols-4";

  const compactPrimaryActionClass =
    "wire-action-compact border-accent/40 bg-accent/10 text-wire-100 hover:border-accent/55 hover:bg-accent/15";
  const compactSecondaryActionClass = "wire-action-compact";
  const compactDangerActionClass =
    "wire-action-compact border-red-400/35 bg-red-400/10 text-red-200 hover:border-red-300/45 hover:bg-red-400/15";
  const compactGhostActionClass =
    "wire-action-compact border-wire-700 bg-transparent text-wire-300 hover:border-wire-600 hover:bg-wire-800";

  return (
    <main>
      <TopBar
        title="Moderation"
        subtitle="Approvals, curation, and content reports"
        backHref="/profile"
      />

      <section className="wire-panel py-4">
        <div className={summaryGridClass}>
          <div className="rounded-[var(--radius-input)] border border-wire-700 bg-wire-800 px-3 py-3">
            <p className="wire-label">Pending events</p>
            <p className="mt-1 text-lg font-semibold text-wire-100">{pendingEventsCount}</p>
          </div>
          {jobsFeatureEnabled ? (
            <div className="rounded-[var(--radius-input)] border border-wire-700 bg-wire-800 px-3 py-3">
              <p className="wire-label">Pending jobs</p>
              <p className="mt-1 text-lg font-semibold text-wire-100">{pendingJobsCount}</p>
            </div>
          ) : null}
          <div className="rounded-[var(--radius-input)] border border-wire-700 bg-wire-800 px-3 py-3">
            <p className="wire-label">Featured listings</p>
            <p className="mt-1 text-lg font-semibold text-wire-100">{featuredListingsCount}</p>
          </div>
          <div className="rounded-[var(--radius-input)] border border-wire-700 bg-wire-800 px-3 py-3">
            <p className="wire-label">Curated communities</p>
            <p className="mt-1 text-lg font-semibold text-wire-100">{formalCommunitiesCount}</p>
          </div>
          <div className="rounded-[var(--radius-input)] border border-wire-700 bg-wire-800 px-3 py-3">
            <p className="wire-label">Open reports</p>
            <p className="mt-1 text-lg font-semibold text-wire-100">{reportsCount}</p>
          </div>
        </div>
      </section>

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
      {jobsLoadError ? (
        <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-[13px] text-red-200">
          {jobsLoadError}
        </div>
      ) : null}
      {listingsLoadError ? (
        <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-[13px] text-red-200">
          {listingsLoadError}
        </div>
      ) : null}
      {communityCurationLoadError ? (
        <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-[13px] text-red-200">
          {communityCurationLoadError}
        </div>
      ) : null}

      <section className="wire-panel">
        <div className="mb-3 border-b border-wire-700 pb-3">
          <h2 className="wire-section-title">Pending event review ({pendingEventsCount})</h2>
          <p className="mt-1 wire-meta">Review events before publishing them to students.</p>
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
                  <p className="wire-meta">Created by: {event.creatorName}</p>
                  <p className="wire-meta">Created at: {formatCampusMessageTimestamp(event.createdAt)}</p>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Link href={`/events/${event.id}`} className={compactSecondaryActionClass}>
                    Open event
                  </Link>
                  <form action={approveEventAction}>
                    <input type="hidden" name="eventId" value={event.id} />
                    <input type="hidden" name="redirectTo" value="/profile/moderation" />
                    <button type="submit" className={compactPrimaryActionClass}>
                      Publish
                    </button>
                  </form>
                  <form action={rejectEventAction}>
                    <input type="hidden" name="eventId" value={event.id} />
                    <input type="hidden" name="redirectTo" value="/profile/moderation" />
                    <button type="submit" className={compactDangerActionClass}>
                      Reject
                    </button>
                  </form>
                </div>
              </article>
            ))}
          </div>
        ) : !pendingLoadError ? (
          <EmptyState
            title="No events pending review"
            description="New events pending review will appear here."
            actionLabel="Back to profile"
            actionHref="/profile"
          />
        ) : null}
      </section>

      {jobsFeatureEnabled ? (
        <section className="wire-panel">
          <div className="mb-3 border-b border-wire-700 pb-3">
            <h2 className="wire-section-title">Pending job review ({pendingJobsCount})</h2>
            <p className="mt-1 wire-meta">Review and publish campus job opportunities.</p>
          </div>

          {pendingJobs.length > 0 ? (
            <div className="space-y-2.5">
              {pendingJobs.map((job) => (
                <article
                  key={job.id}
                  className="rounded-2xl border border-wire-700 bg-wire-800 px-3 py-3"
                >
                  <p className="text-sm font-medium text-wire-100">{job.title}</p>
                  <div className="mt-2 space-y-1">
                    <p className="wire-meta">Organization: {job.organization_name}</p>
                    <p className="wire-meta">Type: {formatJobTypeLabel(job.job_type)}</p>
                    <p className="wire-meta">Location mode: {formatJobLocationModeLabel(job.location_mode)}</p>
                    <p className="wire-meta">Expires: {formatCampusMessageTimestamp(job.expires_at)}</p>
                    <p className="wire-meta">Visibility: {job.is_hidden ? "Hidden" : "Visible"}</p>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Link href={`/jobs/${job.id}`} className={compactSecondaryActionClass}>
                      Open job
                    </Link>
                    <Link href={`/jobs/${job.id}/edit`} className={compactSecondaryActionClass}>
                      Edit
                    </Link>
                    <form action={approveJobAction}>
                      <input type="hidden" name="jobId" value={job.id} />
                      <input type="hidden" name="redirectTo" value="/profile/moderation" />
                      <button type="submit" className={compactPrimaryActionClass}>
                        Publish
                      </button>
                    </form>
                    <form action={rejectJobAction}>
                      <input type="hidden" name="jobId" value={job.id} />
                      <input type="hidden" name="redirectTo" value="/profile/moderation" />
                      <button type="submit" className={compactDangerActionClass}>
                        Reject
                      </button>
                    </form>
                    <form action={setJobHiddenAction}>
                      <input type="hidden" name="jobId" value={job.id} />
                      <input type="hidden" name="isHiddenInput" value={job.is_hidden ? "false" : "true"} />
                      <input type="hidden" name="redirectTo" value="/profile/moderation" />
                      <button type="submit" className={compactGhostActionClass}>
                        {job.is_hidden ? "Unhide" : "Hide"}
                      </button>
                    </form>
                  </div>
                </article>
              ))}
            </div>
          ) : !jobsLoadError ? (
            <EmptyState
              title="No jobs pending review"
              description="New jobs pending review will appear here."
              actionLabel="Open jobs"
              actionHref="/jobs"
            />
          ) : null}
        </section>
      ) : null}

      <section className="wire-panel">
        <div className="mb-3 border-b border-wire-700 pb-3">
          <h2 className="wire-section-title">Featured listings ({featuredListingsCount})</h2>
          <p className="mt-1 wire-meta">Choose which active listings appear at the top of Market.</p>
        </div>

        {listingsForFeature.length > 0 ? (
          <div className="space-y-2.5">
            {listingsForFeature.map((listing) => (
              <article
                key={listing.id}
                className="rounded-2xl border border-wire-700 bg-wire-800 px-3 py-3"
              >
                <p className="text-sm font-medium text-wire-100">{listing.title}</p>
                <div className="mt-2 space-y-1">
                  <p className="wire-meta">Seller: {listing.sellerName}</p>
                  <p className="wire-meta">
                    Type: {formatListingTypeLabel(listing.listingType)} | Price:{" "}
                    {formatCompactListingPrice(listing.priceKzt, listing.pricingModel)} | Status:{" "}
                    {formatStatusLabel(listing.status)}
                  </p>
                  <p className="wire-meta">
                    Featured: {listing.isFeatured ? "Featured" : "Not featured"}
                  </p>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Link href={`/market/item/${listing.id}`} className={compactSecondaryActionClass}>
                    Open listing
                  </Link>
                  <form action={setListingFeaturedAction}>
                    <input type="hidden" name="listingId" value={listing.id} />
                    <input
                      type="hidden"
                      name="isFeaturedInput"
                      value={listing.isFeatured ? "false" : "true"}
                    />
                    <input type="hidden" name="redirectTo" value="/profile/moderation" />
                    <button
                      type="submit"
                      className={listing.isFeatured ? compactGhostActionClass : compactPrimaryActionClass}
                    >
                      {listing.isFeatured ? "Remove featured status" : "Mark as featured"}
                    </button>
                  </form>
                </div>
              </article>
            ))}
          </div>
        ) : !listingsLoadError ? (
          <EmptyState
            title="No active listings yet"
            description="Featured slots will appear here when active listings are available."
            actionLabel="Open market"
            actionHref="/market"
          />
        ) : null}
      </section>

      <section className="wire-panel">
        <div className="mb-3 border-b border-wire-700 pb-3">
          <h2 className="wire-section-title">Community curation ({formalCommunitiesCount} curated)</h2>
          <p className="mt-1 wire-meta">Set trust labels for clubs, organizations, and official groups.</p>
        </div>

        {communitiesForCuration.length > 0 ? (
          <div className="space-y-2.5">
            {communitiesForCuration.map((community) => {
              const isFormal = community.communityType === "formal";
              const isClub = community.formalKind === "club";
              const isOrganization = community.formalKind === "organization";
              const isOfficial = community.formalKind === "official";

              return (
                <article
                  key={community.id}
                  className="rounded-2xl border border-wire-700 bg-wire-800 px-3 py-3"
                >
                  <p className="text-sm font-medium text-wire-100">{community.name}</p>
                  <div className="mt-2 space-y-1">
                    <p className="wire-meta">Owner: {community.ownerName}</p>
                    <p className="wire-meta">Trust: {formatFormalKindLabel(community.formalKind)}</p>
                    <p className="wire-meta">Visibility: {community.isHidden ? "Hidden" : "Visible"}</p>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Link href={`/connect/communities/${community.id}`} className={compactSecondaryActionClass}>
                      Open community
                    </Link>
                    <form action={setCommunityFormalKindAction}>
                      <input type="hidden" name="communityId" value={community.id} />
                      <input type="hidden" name="formalKind" value="club" />
                      <input type="hidden" name="redirectTo" value="/profile/moderation" />
                      <button type="submit" disabled={isClub} className={isClub ? compactPrimaryActionClass : compactSecondaryActionClass}>
                        Set club label
                      </button>
                    </form>
                    <form action={setCommunityFormalKindAction}>
                      <input type="hidden" name="communityId" value={community.id} />
                      <input type="hidden" name="formalKind" value="organization" />
                      <input type="hidden" name="redirectTo" value="/profile/moderation" />
                      <button
                        type="submit"
                        disabled={isOrganization}
                        className={isOrganization ? compactPrimaryActionClass : compactSecondaryActionClass}
                      >
                        Set organization label
                      </button>
                    </form>
                    <form action={setCommunityFormalKindAction}>
                      <input type="hidden" name="communityId" value={community.id} />
                      <input type="hidden" name="formalKind" value="official" />
                      <input type="hidden" name="redirectTo" value="/profile/moderation" />
                      <button
                        type="submit"
                        disabled={isOfficial}
                        className={isOfficial ? compactPrimaryActionClass : compactSecondaryActionClass}
                      >
                        Set official label
                      </button>
                    </form>
                    {isFormal ? (
                      <form action={clearCommunityFormalStatusAction}>
                        <input type="hidden" name="communityId" value={community.id} />
                        <input type="hidden" name="redirectTo" value="/profile/moderation" />
                        <button type="submit" className={compactGhostActionClass}>
                          Clear trust label
                        </button>
                      </form>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        ) : !communityCurationLoadError ? (
          <EmptyState
            title="No communities yet"
            description="Communities will appear here for trust curation."
            actionLabel="Open communities"
            actionHref="/connect/communities"
          />
        ) : null}
      </section>

      <section className="wire-panel">
        <div className="mb-3 border-b border-wire-700 pb-3">
          <h2 className="wire-section-title">Content reports ({reportsCount})</h2>
          <p className="mt-1 wire-meta">Review reports and toggle target visibility when needed.</p>
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
                      Reported by {report.reporterName} - {formatCampusMessageTimestamp(report.createdAt)}
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
                      <Link href={report.targetLink} className={compactSecondaryActionClass}>
                        Open target
                      </Link>
                    ) : null}
                    {report.targetExists && report.targetHidden !== null ? (
                      <form action={setContentHiddenAction}>
                        <input type="hidden" name="targetType" value={report.targetType} />
                        <input type="hidden" name="targetId" value={report.targetId} />
                        <input type="hidden" name="isHiddenInput" value={nextHiddenValue} />
                        <input type="hidden" name="redirectTo" value="/profile/moderation" />
                        <button
                          type="submit"
                          className={report.targetHidden ? compactGhostActionClass : compactPrimaryActionClass}
                        >
                          {hideLabel}
                        </button>
                      </form>
                    ) : null}
                    <form action={resolveContentReportAction}>
                      <input type="hidden" name="reportId" value={report.id} />
                      <input type="hidden" name="redirectTo" value="/profile/moderation" />
                      <button type="submit" className={compactSecondaryActionClass}>
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
