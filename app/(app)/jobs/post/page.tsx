import { notFound } from "next/navigation";
import { FormSection } from "@/components/ui/FormSection";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { TopBar } from "@/components/ui/TopBar";
import { WireField, WireTextarea } from "@/components/ui/WireField";
import { isFeatureEnabled } from "@/lib/config/features";
import {
  formatJobLocationModeLabel,
  formatJobTypeLabel,
} from "@/lib/jobs/data";
import { createJobAction } from "@/lib/jobs/actions";
import { isAdminUser, requireAdminUser } from "@/lib/moderation/data";
import {
  JOB_APPLY_METHOD_VALUES,
  JOB_LOCATION_MODE_VALUES,
  JOB_TYPE_VALUES,
} from "@/lib/validation/jobs";

type JobsPostPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

function formatApplyMethodLabel(method: (typeof JOB_APPLY_METHOD_VALUES)[number]): string {
  if (method === "email") return "Email";
  if (method === "telegram") return "Telegram";
  return "External link";
}

export default async function JobsPostPage({ searchParams }: JobsPostPageProps) {
  if (!isFeatureEnabled("jobsBoard")) {
    notFound();
  }

  const [{ error }, adminUser] = await Promise.all([searchParams, requireAdminUser()]);
  if (!isAdminUser(adminUser)) {
    notFound();
  }

  return (
    <main>
      <TopBar
        title="Post Job"
        subtitle="Create a campus-reviewed vacancy entry"
        backHref="/jobs"
      />
      {error ? (
        <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-[13px] text-red-200">
          {error}
        </div>
      ) : null}

      <form action={createJobAction} className="flex flex-col gap-5">
        <FormSection title="Role">
          <WireField label="Job title" name="title" required placeholder="Research Assistant (AI Lab)" />
          <WireField label="Organization" name="organizationName" required placeholder="NU AI Lab" />
          <label className="block space-y-2">
            <span className="wire-label">Job type</span>
            <select name="jobType" required className="wire-input-field" defaultValue={JOB_TYPE_VALUES[0]}>
              {JOB_TYPE_VALUES.map((jobType) => (
                <option key={jobType} value={jobType}>
                  {formatJobTypeLabel(jobType)}
                </option>
              ))}
            </select>
          </label>
        </FormSection>

        <FormSection title="Location">
          <label className="block space-y-2">
            <span className="wire-label">Location mode</span>
            <select
              name="locationMode"
              required
              className="wire-input-field"
              defaultValue={JOB_LOCATION_MODE_VALUES[0]}
            >
              {JOB_LOCATION_MODE_VALUES.map((locationMode) => (
                <option key={locationMode} value={locationMode}>
                  {formatJobLocationModeLabel(locationMode)}
                </option>
              ))}
            </select>
          </label>
          <WireField
            label="Location details (optional)"
            name="locationText"
            placeholder="Block C5, room 214"
          />
        </FormSection>

        <FormSection title="Description">
          <WireTextarea
            label="Role details"
            name="description"
            rows={7}
            placeholder="Describe responsibilities, expected workload, and role scope."
          />
          <WireTextarea
            label="Requirements (optional)"
            name="requirements"
            rows={4}
            placeholder="List skills, course background, or portfolio expectations."
          />
          <WireField
            label="Compensation (optional)"
            name="compensationText"
            placeholder="Paid stipend, hourly pay, or unpaid volunteer role"
          />
        </FormSection>

        <FormSection title="Apply">
          <label className="block space-y-2">
            <span className="wire-label">Apply method</span>
            <select
              name="applyMethod"
              required
              className="wire-input-field"
              defaultValue={JOB_APPLY_METHOD_VALUES[0]}
            >
              {JOB_APPLY_METHOD_VALUES.map((method) => (
                <option key={method} value={method}>
                  {formatApplyMethodLabel(method)}
                </option>
              ))}
            </select>
          </label>
          <WireField
            label="Application link (for External link)"
            name="applyUrl"
            placeholder="https://..."
          />
          <WireField
            label="Application email (for Email)"
            name="applyEmail"
            type="email"
            placeholder="careers@example.com"
          />
          <WireField
            label="Telegram contact (for Telegram)"
            name="applyTelegram"
            placeholder="@team_handle or https://t.me/team_handle"
          />
          <WireField
            label="Expires at"
            name="expiresAtInput"
            type="datetime-local"
            required
          />
        </FormSection>

        <div className="wire-action-row-single">
          <SubmitButton label="Submit for review" pendingLabel="Submitting..." variant="primary" />
        </div>
      </form>
    </main>
  );
}
