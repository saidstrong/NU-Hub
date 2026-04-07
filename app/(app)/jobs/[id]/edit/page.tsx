import Link from "next/link";
import { notFound } from "next/navigation";
import { FormSection } from "@/components/ui/FormSection";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { TagChip } from "@/components/ui/TagChip";
import { TopBar } from "@/components/ui/TopBar";
import { WireField, WireTextarea } from "@/components/ui/WireField";
import { isFeatureEnabled } from "@/lib/config/features";
import {
  approveJobAction,
  rejectJobAction,
  setJobHiddenAction,
  updateJobAction,
} from "@/lib/jobs/actions";
import {
  formatJobLocationModeLabel,
  formatJobStatusLabel,
  formatJobTypeLabel,
  getJobForAdminEdit,
} from "@/lib/jobs/data";
import { isAdminUser, requireAdminUser } from "@/lib/moderation/data";
import {
  JOB_APPLY_METHOD_VALUES,
  JOB_LOCATION_MODE_VALUES,
  JOB_TYPE_VALUES,
} from "@/lib/validation/jobs";
import { isUuid } from "@/lib/validation/uuid";
import { utcIsoToNuLocalDateTimeInput } from "@/lib/validation/events";

type EditJobPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
};

function formatApplyMethodLabel(method: (typeof JOB_APPLY_METHOD_VALUES)[number]): string {
  if (method === "email") return "Email";
  if (method === "telegram") return "Telegram";
  return "External link";
}

export default async function EditJobPage({ params, searchParams }: EditJobPageProps) {
  if (!isFeatureEnabled("jobsBoard")) {
    notFound();
  }

  const [{ id }, { error, message }, adminUser] = await Promise.all([
    params,
    searchParams,
    requireAdminUser(),
  ]);

  if (!isUuid(id) || !isAdminUser(adminUser)) {
    notFound();
  }

  let job: Awaited<ReturnType<typeof getJobForAdminEdit>> = null;
  let loadError: string | null = null;
  try {
    job = await getJobForAdminEdit(id);
  } catch (issue) {
    loadError = issue instanceof Error ? issue.message : "Failed to load job.";
  }

  if (!job) {
    return (
      <main>
        <TopBar title="Edit Opportunity" backHref="/jobs" />
        {loadError ? (
          <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-[13px] text-red-200">
            {loadError}
          </div>
        ) : null}
        <p className="wire-inline-empty">Opportunity not found.</p>
      </main>
    );
  }

  const expiresAtInput = utcIsoToNuLocalDateTimeInput(job.expires_at) ?? "";

  return (
    <main>
      <TopBar
        title="Edit Opportunity"
        subtitle="Keep this opportunity clear for students who may still review and apply to it"
        backHref={`/jobs/${job.id}`}
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

      <section className="wire-panel py-3">
        <p className="wire-label">Opportunity maintenance</p>
        <p className="mt-1 text-[13px] leading-relaxed text-wire-300">
          Keep the organization, location, application method, and closing date accurate so students can still understand the opening and apply outside Atrium.
        </p>
      </section>

      <section className="wire-panel py-4">
        <div className="flex flex-wrap items-center gap-2">
          <TagChip label={formatJobStatusLabel(job.status)} tone="status" />
          <TagChip label={job.is_hidden ? "Hidden" : "Visible"} tone="status" />
        </div>
      </section>

      <form action={updateJobAction} className="flex flex-col gap-5">
        <input type="hidden" name="jobId" value={job.id} />

        <FormSection
          title="Opportunity"
          description="Keep the title, organization, and type clear so students can judge the opening quickly."
        >
          <WireField label="Opportunity title" name="title" required defaultValue={job.title} />
          <WireField label="Organization" name="organizationName" required defaultValue={job.organization_name} />
          <label className="block space-y-2">
            <span className="wire-label">Opportunity type</span>
            <select name="jobType" required className="wire-input-field" defaultValue={job.job_type}>
              {JOB_TYPE_VALUES.map((jobType) => (
                <option key={jobType} value={jobType}>
                  {formatJobTypeLabel(jobType)}
                </option>
              ))}
            </select>
          </label>
        </FormSection>

        <FormSection
          title="Location"
          description="Keep the location mode and details aligned with where students should actually expect the opportunity to happen."
        >
          <label className="block space-y-2">
            <span className="wire-label">Location mode</span>
            <select name="locationMode" required className="wire-input-field" defaultValue={job.location_mode}>
              {JOB_LOCATION_MODE_VALUES.map((locationMode) => (
                <option key={locationMode} value={locationMode}>
                  {formatJobLocationModeLabel(locationMode)}
                </option>
              ))}
            </select>
          </label>
          <WireField label="Location details (optional)" name="locationText" defaultValue={job.location_text ?? ""} />
        </FormSection>

        <FormSection
          title="Details"
          description="Keep the responsibilities, audience fit, and expectations easy to understand before a student applies."
        >
          <WireTextarea label="Opportunity details" name="description" rows={7} defaultValue={job.description} />
          <WireTextarea
            label="Requirements (optional)"
            name="requirements"
            rows={4}
            defaultValue={job.requirements ?? ""}
          />
          <WireField
            label="Compensation (optional)"
            name="compensationText"
            defaultValue={job.compensation_text ?? ""}
          />
        </FormSection>

        <FormSection
          title="Apply"
          description="Students will use one listed method to apply outside Atrium before the closing date."
        >
          <label className="block space-y-2">
            <span className="wire-label">Apply method</span>
            <select name="applyMethod" required className="wire-input-field" defaultValue={job.apply_method}>
              {JOB_APPLY_METHOD_VALUES.map((method) => (
                <option key={method} value={method}>
                  {formatApplyMethodLabel(method)}
                </option>
              ))}
            </select>
          </label>
          <WireField
            label="External application link"
            name="applyUrl"
            defaultValue={job.apply_url ?? ""}
          />
          <WireField
            label="Application email"
            name="applyEmail"
            type="email"
            defaultValue={job.apply_email ?? ""}
          />
          <WireField
            label="Telegram contact"
            name="applyTelegram"
            defaultValue={job.apply_telegram ?? ""}
          />
          <WireField
            label="Closes at"
            name="expiresAtInput"
            type="datetime-local"
            required
            defaultValue={expiresAtInput}
          />
        </FormSection>

        <div className="wire-action-row">
          <Link href={`/jobs/${job.id}`} className="wire-action">
            Cancel
          </Link>
          <SubmitButton label="Save opportunity changes" pendingLabel="Saving..." variant="primary" />
        </div>
      </form>

      <section className="wire-panel">
        <h2 className="wire-section-title mb-2">Publication</h2>
        <p className="mb-3 wire-meta">
          Use these controls to publish, reject, or hide the opportunity after reviewing how students will see it.
        </p>
        <div className="wire-action-row">
          <form action={approveJobAction}>
            <input type="hidden" name="jobId" value={job.id} />
            <input type="hidden" name="redirectTo" value={`/jobs/${job.id}/edit`} />
            <SubmitButton
              label="Publish"
              pendingLabel="Publishing..."
              variant="primary"
              className="w-auto"
            />
          </form>
          <form action={rejectJobAction}>
            <input type="hidden" name="jobId" value={job.id} />
            <input type="hidden" name="redirectTo" value={`/jobs/${job.id}/edit`} />
            <SubmitButton label="Reject" pendingLabel="Rejecting..." className="w-auto" />
          </form>
          <form action={setJobHiddenAction}>
            <input type="hidden" name="jobId" value={job.id} />
            <input type="hidden" name="isHiddenInput" value={job.is_hidden ? "false" : "true"} />
            <input type="hidden" name="redirectTo" value={`/jobs/${job.id}/edit`} />
            <SubmitButton
              label={job.is_hidden ? "Unhide" : "Hide"}
              pendingLabel={job.is_hidden ? "Unhiding..." : "Hiding..."}
              className="w-auto"
            />
          </form>
        </div>
      </section>
    </main>
  );
}
