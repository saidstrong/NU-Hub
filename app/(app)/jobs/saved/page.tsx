import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/ui/EmptyState";
import { FeedbackBanner } from "@/components/ui/FeedbackBanner";
import { PageNavigation } from "@/components/ui/PageNavigation";
import { TagChip } from "@/components/ui/TagChip";
import { TopBar } from "@/components/ui/TopBar";
import { isFeatureEnabled } from "@/lib/config/features";
import { formatCampusMessageTimestamp } from "@/lib/datetime";
import { toggleSavedJobAction } from "@/lib/jobs/actions";
import {
  formatJobApplyMethodLabel,
  formatJobLocationModeLabel,
  formatJobTypeLabel,
  getSavedJobsPage,
} from "@/lib/jobs/data";
import { buildPageHref, parsePageParam } from "@/lib/pagination";

type SavedJobsPageProps = {
  searchParams: Promise<{
    page?: string;
    error?: string;
  }>;
};

const SAVED_JOBS_PAGE_SIZE = 12;

export default async function SavedJobsPage({ searchParams }: SavedJobsPageProps) {
  if (!isFeatureEnabled("jobsBoard")) {
    notFound();
  }

  const { page: pageParam, error } = await searchParams;
  const page = parsePageParam(pageParam);

  let jobs: Awaited<ReturnType<typeof getSavedJobsPage>>["jobs"] = [];
  let hasMore = false;
  let loadError: string | null = null;

  try {
    const savedJobs = await getSavedJobsPage(page, SAVED_JOBS_PAGE_SIZE);
    jobs = savedJobs.jobs;
    hasMore = savedJobs.hasMore;
  } catch (issue) {
    loadError =
      issue instanceof Error ? issue.message : "Failed to load saved opportunities.";
  }

  const previousHref = page > 1 ? buildPageHref("/jobs/saved", page - 1) : undefined;
  const nextHref = hasMore ? buildPageHref("/jobs/saved", page + 1) : undefined;
  const currentPageHref = buildPageHref("/jobs/saved", page);

  return (
    <main>
      <TopBar
        title="Saved Opportunities"
        subtitle="Opportunities you want to revisit, compare, or return to before applying externally."
        backHref="/jobs"
      />

      <section className="wire-panel py-3">
        <p className="wire-label">Saved for later</p>
        <p className="mt-1 text-[13px] leading-relaxed text-wire-300">
          Saved opportunities help you revisit details, compare options, and return before the closing date. Only currently visible opportunities appear here.
        </p>
        {!loadError ? (
          <p className="mt-2 text-[12px] font-medium text-wire-200">
            {jobs.length} saved opportunit{jobs.length === 1 ? "y" : "ies"} on this page
          </p>
        ) : null}
      </section>

      {error ? <FeedbackBanner tone="error" message={error} /> : null}
      {loadError ? <FeedbackBanner tone="error" message={loadError} /> : null}

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
                {job.location_text ? (
                  <p className="wire-meta">Location: {job.location_text}</p>
                ) : null}
                {job.compensation_text ? (
                  <p className="wire-meta">Compensation: {job.compensation_text}</p>
                ) : null}
                <p className="wire-meta">
                  Apply: {formatJobApplyMethodLabel(job.apply_method)}
                </p>
                <p className="wire-meta">
                  Expires: {formatCampusMessageTimestamp(job.expires_at)}
                </p>
              </div>
              <div className="mt-3">
                <Link href={`/jobs/${job.id}`} className="wire-link">
                  Open opportunity
                </Link>
              </div>
              <form action={toggleSavedJobAction} className="mt-2">
                <input type="hidden" name="jobId" value={job.id} />
                <input type="hidden" name="redirectTo" value={currentPageHref} />
                <button type="submit" className="wire-action w-full text-[12px]">
                  Remove from saved
                </button>
              </form>
            </article>
          ))}
        </div>
      ) : !loadError ? (
        <EmptyState
          title="No saved opportunities yet"
          description="Save an opportunity from its detail page when you want to revisit it, compare options, or return before applying externally."
          actionLabel="Browse opportunities"
          actionHref="/jobs"
        />
      ) : null}

      <PageNavigation
        previousHref={previousHref}
        nextHref={nextHref}
        previousLabel="Previous page"
        nextLabel="Next page"
      />
    </main>
  );
}
