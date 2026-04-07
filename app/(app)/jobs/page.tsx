import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/ui/EmptyState";
import { FeedbackBanner } from "@/components/ui/FeedbackBanner";
import { PageNavigation } from "@/components/ui/PageNavigation";
import { SearchBar } from "@/components/ui/SearchBar";
import { SectionCard } from "@/components/ui/SectionCard";
import { TagChip } from "@/components/ui/TagChip";
import { TopBar } from "@/components/ui/TopBar";
import { requireUser } from "@/lib/auth/session";
import { isFeatureEnabled } from "@/lib/config/features";
import { formatCampusMessageTimestamp } from "@/lib/datetime";
import {
  formatJobApplyMethodLabel,
  formatJobLocationModeLabel,
  formatJobTypeLabel,
  getPublishedJobsPage,
} from "@/lib/jobs/data";
import { isAdminUser } from "@/lib/moderation/data";
import { buildPageHref, parsePageParam } from "@/lib/pagination";
import {
  JOB_LOCATION_MODE_VALUES,
  JOB_TYPE_VALUES,
} from "@/lib/validation/jobs";
import { parseSearchQueryParam } from "@/lib/validation/search";

type JobsPageProps = {
  searchParams: Promise<{
    q?: string;
    type?: string;
    mode?: string;
    page?: string;
    message?: string;
    error?: string;
  }>;
};

const JOBS_PAGE_SIZE = 12;

function parseTypeFilter(value?: string): (typeof JOB_TYPE_VALUES)[number] | undefined {
  if (!value || value === "all") return undefined;
  return JOB_TYPE_VALUES.includes(value as (typeof JOB_TYPE_VALUES)[number])
    ? (value as (typeof JOB_TYPE_VALUES)[number])
    : undefined;
}

function parseLocationModeFilter(
  value?: string,
): (typeof JOB_LOCATION_MODE_VALUES)[number] | undefined {
  if (!value || value === "all") return undefined;
  return JOB_LOCATION_MODE_VALUES.includes(value as (typeof JOB_LOCATION_MODE_VALUES)[number])
    ? (value as (typeof JOB_LOCATION_MODE_VALUES)[number])
    : undefined;
}

function buildJobsHref(
  page: number,
  params: {
    q?: string;
    type?: string;
    mode?: string;
  },
): string {
  return buildPageHref("/jobs", page, {
    q: params.q?.trim() ? params.q.trim() : undefined,
    type: params.type && params.type !== "all" ? params.type : undefined,
    mode: params.mode && params.mode !== "all" ? params.mode : undefined,
  });
}

export default async function JobsPage({ searchParams }: JobsPageProps) {
  if (!isFeatureEnabled("jobsBoard")) {
    notFound();
  }

  const [
    user,
    { q, type, mode, page: pageParam, message, error },
  ] = await Promise.all([requireUser(), searchParams]);
  const isAdmin = isAdminUser(user);
  const page = parsePageParam(pageParam);
  const parsedType = parseTypeFilter(type);
  const parsedMode = parseLocationModeFilter(mode);
  const parsedQuery = parseSearchQueryParam(q);
  const activeType = parsedType ?? "all";
  const activeMode = parsedMode ?? "all";

  let jobs: Awaited<ReturnType<typeof getPublishedJobsPage>>["jobs"] = [];
  let hasMore = false;
  let loadError: string | null = null;

  try {
    const result = await getPublishedJobsPage({
      page,
      pageSize: JOBS_PAGE_SIZE,
      query: parsedQuery.query,
      jobType: parsedType,
      locationMode: parsedMode,
    });
    jobs = result.jobs;
    hasMore = result.hasMore;
  } catch (loadIssue) {
    loadError = loadIssue instanceof Error ? loadIssue.message : "Failed to load jobs.";
  }

  const previousHref =
    page > 1
      ? buildJobsHref(page - 1, { q, type: activeType, mode: activeMode })
      : undefined;
  const nextHref = hasMore
    ? buildJobsHref(page + 1, { q, type: activeType, mode: activeMode })
    : undefined;

  return (
    <main>
      <TopBar
        title="Jobs & Opportunities"
        subtitle="Internships, part-time roles, volunteer openings, and research opportunities students can pursue."
        backHref="/home"
        actions={[
          { label: "Saved", href: "/jobs/saved", variant: "ghost" },
          ...(isAdmin ? [{ label: "Post", href: "/jobs/post" as const }] : []),
        ]}
      />

      <SearchBar
        placeholder="Search opportunities by title, organization, or keywords"
        queryName="q"
        defaultValue={q}
        action="/jobs"
      />

      {message ? <FeedbackBanner tone="success" message={message} /> : null}
      {error ? <FeedbackBanner tone="error" message={error} /> : null}
      {parsedQuery.error ? <FeedbackBanner tone="error" message={parsedQuery.error} /> : null}
      {loadError ? <FeedbackBanner tone="error" message={loadError} /> : null}

      <section className="wire-panel py-3">
        <p className="wire-label">Current scope</p>
        <p className="mt-1 text-[13px] leading-relaxed text-wire-300">
          Atrium currently supports internships, part-time roles, volunteer openings, and research positions. Open an opportunity to review the details, save it for later, and apply through the listed method.
        </p>
      </section>

      <section className="wire-panel py-4">
        <p className="mb-2 wire-label">Type</p>
        <div className="-mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Link href={buildJobsHref(1, { q, type: "all", mode: activeMode })} className="shrink-0 snap-start">
            <TagChip label="All" active={activeType === "all"} />
          </Link>
          {JOB_TYPE_VALUES.map((jobType) => (
            <Link
              key={jobType}
              href={buildJobsHref(1, { q, type: jobType, mode: activeMode })}
              className="shrink-0 snap-start"
            >
              <TagChip label={formatJobTypeLabel(jobType)} active={activeType === jobType} />
            </Link>
          ))}
        </div>
        <p className="mb-2 mt-1 wire-label">Location</p>
        <div className="-mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Link href={buildJobsHref(1, { q, type: activeType, mode: "all" })} className="shrink-0 snap-start">
            <TagChip label="All" active={activeMode === "all"} />
          </Link>
          {JOB_LOCATION_MODE_VALUES.map((locationMode) => (
            <Link
              key={locationMode}
              href={buildJobsHref(1, { q, type: activeType, mode: locationMode })}
              className="shrink-0 snap-start"
            >
              <TagChip
                label={formatJobLocationModeLabel(locationMode)}
                active={activeMode === locationMode}
              />
            </Link>
          ))}
        </div>
      </section>

      <SectionCard
        title="Open opportunities"
        subtitle="Current student-facing openings that can still be pursued."
      >
        {jobs.length > 0 ? (
          <div className="wire-list">
            {jobs.map((job) => (
              <article
                key={job.id}
                className="rounded-[var(--radius-card)] border border-wire-700 bg-wire-800 px-4 py-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="line-clamp-2 text-[15px] font-semibold text-wire-100 [overflow-wrap:anywhere]">
                      {job.title}
                    </h2>
                    <p className="mt-1 text-[13px] text-wire-200">{job.organization_name}</p>
                  </div>
                  <TagChip label="Open" tone="status" />
                </div>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  <TagChip label={formatJobTypeLabel(job.job_type)} active />
                  <TagChip label={formatJobLocationModeLabel(job.location_mode)} tone="status" />
                </div>
                <div className="mt-2.5 space-y-1">
                  {job.location_text ? <p className="wire-meta">Location: {job.location_text}</p> : null}
                  {job.compensation_text ? (
                    <p className="wire-meta">Compensation: {job.compensation_text}</p>
                  ) : null}
                  <p className="wire-meta">Apply: {formatJobApplyMethodLabel(job.apply_method)}</p>
                  <p className="wire-meta">Expires: {formatCampusMessageTimestamp(job.expires_at)}</p>
                </div>
                <div className="mt-3">
                  <Link href={`/jobs/${job.id}`} className="wire-link">
                    Open opportunity
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : !loadError ? (
          <EmptyState
            title="No open opportunities right now"
            description="Published internships, part-time roles, volunteer openings, and research positions will appear here when available."
            actionLabel="Back to home"
            actionHref="/home"
          />
        ) : null}
      </SectionCard>

      <PageNavigation
        previousHref={previousHref}
        nextHref={nextHref}
        previousLabel="Previous page"
        nextLabel="Next page"
      />
    </main>
  );
}
