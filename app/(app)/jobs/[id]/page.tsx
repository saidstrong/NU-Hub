import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/ui/EmptyState";
import { FeedbackBanner } from "@/components/ui/FeedbackBanner";
import { SectionCard } from "@/components/ui/SectionCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { TagChip } from "@/components/ui/TagChip";
import { requireUser } from "@/lib/auth/session";
import { isFeatureEnabled } from "@/lib/config/features";
import { formatCampusMessageTimestamp } from "@/lib/datetime";
import { toggleSavedJobAction } from "@/lib/jobs/actions";
import {
  formatJobApplyMethodLabel,
  formatJobLocationModeLabel,
  formatJobStatusLabel,
  formatJobTypeLabel,
  getPublishedJobDetail,
  isJobSavedByViewer,
  isJobExpired,
  isPublicJobVisible,
} from "@/lib/jobs/data";
import { isAdminUser } from "@/lib/moderation/data";
import { isUuid } from "@/lib/validation/uuid";

type JobDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ message?: string; error?: string }>;
};

function getApplyHref(job: Awaited<ReturnType<typeof getPublishedJobDetail>>) {
  if (!job) return null;

  if (job.apply_method === "link" && job.apply_url) {
    return job.apply_url;
  }

  if (job.apply_method === "email" && job.apply_email) {
    return `mailto:${job.apply_email}`;
  }

  if (job.apply_method === "telegram" && job.apply_telegram) {
    const trimmed = job.apply_telegram.trim();
    if (/^https?:\/\//i.test(trimmed)) {
      return trimmed;
    }
    const username = trimmed.replace(/^@+/, "");
    return username ? `https://t.me/${username}` : null;
  }

  return null;
}

function getApplyButtonLabel(job: NonNullable<Awaited<ReturnType<typeof getPublishedJobDetail>>>) {
  if (job.apply_method === "email") return "Apply by email";
  if (job.apply_method === "telegram") return "Open Telegram contact";
  return "Open external application";
}

export default async function JobDetailPage({ params, searchParams }: JobDetailPageProps) {
  if (!isFeatureEnabled("jobsBoard")) {
    notFound();
  }

  const [{ id }, { message, error }] = await Promise.all([params, searchParams]);

  if (!isUuid(id)) {
    notFound();
  }

  const viewer = await requireUser();
  const canEdit = isAdminUser(viewer);

  let job: Awaited<ReturnType<typeof getPublishedJobDetail>> = null;
  let isSaved = false;
  let loadError: string | null = null;

  try {
    job = await getPublishedJobDetail(id);
    if (job && isPublicJobVisible(job)) {
      isSaved = await isJobSavedByViewer(id);
    }
  } catch (issue) {
    loadError = issue instanceof Error ? issue.message : "Failed to load job.";
  }

  if (!job) {
    return (
      <main>
        <section className="wire-panel">
          <SectionHeader
            title="Opportunity"
            subtitle="Organization, application method, and deadline details."
            actionNode={
              <Link href="/jobs" className="wire-link">
                Back to jobs
              </Link>
            }
          />
        </section>
        {loadError ? <FeedbackBanner tone="error" message={loadError} /> : null}
        <EmptyState
          title="Opportunity not available"
          description="This listing may be unpublished, expired, or removed."
          actionLabel="Back to jobs"
          actionHref="/jobs"
        />
      </main>
    );
  }

  const applyHref = getApplyHref(job);
  const jobStatusLabel = isJobExpired(job.expires_at)
    ? "Expired"
    : job.status === "published"
      ? "Open"
      : formatJobStatusLabel(job.status);
  const applyMethodLabel = formatJobApplyMethodLabel(job.apply_method);
  const locationLabel = job.location_text || formatJobLocationModeLabel(job.location_mode);
  const isPubliclyVisible = isPublicJobVisible(job);

  return (
    <main>
      <section className="wire-panel">
        <SectionHeader
          title="Opportunity"
          subtitle="Review what this is, who it is with, how to apply, and when it closes."
          actionNode={
            <Link href="/jobs" className="wire-link">
              Back to jobs
            </Link>
          }
        />
        <div className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-[28px] font-semibold leading-[34px] tracking-tight break-words text-wire-100">
                {job.title}
              </h2>
              <p className="mt-1 text-[14px] text-wire-200">{job.organization_name}</p>
            </div>
            <TagChip label={jobStatusLabel} tone="status" />
          </div>
          <div className="flex flex-wrap gap-2">
            <TagChip label={formatJobTypeLabel(job.job_type)} active />
            <TagChip label={formatJobLocationModeLabel(job.location_mode)} tone="status" />
            <TagChip label={applyMethodLabel} tone="status" />
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-[var(--radius-input)] border border-wire-700 bg-wire-800 px-3 py-2">
              <p className="wire-label">Organization</p>
              <p className="mt-1 text-sm text-wire-100">{job.organization_name}</p>
            </div>
            <div className="rounded-[var(--radius-input)] border border-wire-700 bg-wire-800 px-3 py-2">
              <p className="wire-label">Opportunity type</p>
              <p className="mt-1 text-sm text-wire-100">{formatJobTypeLabel(job.job_type)}</p>
            </div>
            <div className="rounded-[var(--radius-input)] border border-wire-700 bg-wire-800 px-3 py-2">
              <p className="wire-label">Location</p>
              <p className="mt-1 text-sm text-wire-100">{locationLabel}</p>
            </div>
            <div className="rounded-[var(--radius-input)] border border-wire-700 bg-wire-800 px-3 py-2">
              <p className="wire-label">Closes</p>
              <p className="mt-1 text-sm text-wire-100">{formatCampusMessageTimestamp(job.expires_at)}</p>
            </div>
          </div>
        </div>
      </section>

      {message ? <FeedbackBanner tone="success" message={message} /> : null}
      {error ? <FeedbackBanner tone="error" message={error} /> : null}
      {job.status === "pending_review" && canEdit ? (
        <FeedbackBanner tone="warning" message="This opportunity is pending review and not visible to students yet." />
      ) : null}
      {job.status === "rejected" && canEdit ? (
        <FeedbackBanner tone="error" message="This opportunity is rejected and not visible in jobs browse." />
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <SectionCard
          title="About this opportunity"
          subtitle="What the role involves and what students should understand before applying."
        >
          <p className="whitespace-pre-wrap break-words text-[14px] leading-relaxed text-wire-200 [overflow-wrap:anywhere]">
            {job.description}
          </p>
        </SectionCard>

        <SectionCard
          title="Apply externally"
          subtitle="Atrium does not process applications or track application status."
        >
          <div className="mb-3 space-y-1">
            <p className="wire-meta">Apply method: {applyMethodLabel}</p>
            {job.compensation_text ? (
              <p className="wire-meta">Compensation: {job.compensation_text}</p>
            ) : null}
          </div>
          {applyHref ? (
            <a
              href={applyHref}
              className="wire-action-primary inline-flex w-full justify-center"
              target={job.apply_method === "email" ? undefined : "_blank"}
              rel={job.apply_method === "email" ? undefined : "noreferrer"}
            >
              {getApplyButtonLabel(job)}
            </a>
          ) : (
            <p className="wire-inline-empty">Application contact unavailable.</p>
          )}
          {isPubliclyVisible ? (
            <form action={toggleSavedJobAction} className="mt-2">
              <input type="hidden" name="jobId" value={job.id} />
              <input type="hidden" name="redirectTo" value={`/jobs/${job.id}`} />
              <button type="submit" className="wire-action w-full text-[12px]">
                {isSaved ? "Remove from saved" : "Save opportunity"}
              </button>
            </form>
          ) : null}
          <p className="mt-3 text-[12px] leading-relaxed text-wire-300">
            Review the opportunity details here, save it if you want to revisit it, and use the listed method to apply outside Atrium before the closing date.
          </p>

          {canEdit ? (
            <div className="mt-3">
              <Link href={`/jobs/${job.id}/edit`} className="wire-action">
                Manage opportunity
              </Link>
            </div>
          ) : null}
        </SectionCard>
      </div>

      <SectionCard title="Requirements">
        <p className="whitespace-pre-wrap break-words text-[14px] leading-relaxed text-wire-200 [overflow-wrap:anywhere]">
          {job.requirements || "No additional requirements listed."}
        </p>
      </SectionCard>
    </main>
  );
}
