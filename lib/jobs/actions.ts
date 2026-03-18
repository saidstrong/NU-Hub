"use server";

import { revalidatePath } from "next/cache";
import {
  getStringValue,
  redirectWithError,
  redirectWithMessage,
  sanitizeInternalPath,
} from "@/lib/actions/helpers";
import { requireUser } from "@/lib/auth/session";
import { isFeatureEnabled } from "@/lib/config/features";
import { isAdminUser } from "@/lib/moderation/data";
import { createClient } from "@/lib/supabase/server";
import {
  createJobSchema,
  jobMutationIdSchema,
  moderateJobSchema,
  setJobHiddenSchema,
  updateJobSchema,
} from "@/lib/validation/jobs";
import { nuLocalDateTimeToUtcIso } from "@/lib/validation/events";

function revalidateJobPaths(jobId: string) {
  revalidatePath("/jobs");
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath(`/jobs/${jobId}/edit`);
  revalidatePath("/profile/moderation");
}

function assertJobsBoardEnabled(path: string) {
  if (!isFeatureEnabled("jobsBoard")) {
    redirectWithError(path, "Jobs board is currently disabled.");
  }
}

function toApplyPayload(input: {
  applyMethod: "link" | "email" | "telegram";
  applyUrl: string | null;
  applyEmail: string | null;
  applyTelegram: string | null;
}) {
  if (input.applyMethod === "link") {
    return {
      apply_url: input.applyUrl,
      apply_email: null,
      apply_telegram: null,
    };
  }

  if (input.applyMethod === "email") {
    return {
      apply_url: null,
      apply_email: input.applyEmail,
      apply_telegram: null,
    };
  }

  return {
    apply_url: null,
    apply_email: null,
    apply_telegram: input.applyTelegram,
  };
}

export async function createJobAction(formData: FormData) {
  assertJobsBoardEnabled("/jobs");
  const parsed = createJobSchema.safeParse({
    title: getStringValue(formData, "title"),
    organizationName: getStringValue(formData, "organizationName"),
    jobType: getStringValue(formData, "jobType"),
    locationMode: getStringValue(formData, "locationMode"),
    locationText: getStringValue(formData, "locationText"),
    description: getStringValue(formData, "description"),
    requirements: getStringValue(formData, "requirements"),
    compensationText: getStringValue(formData, "compensationText"),
    applyMethod: getStringValue(formData, "applyMethod"),
    applyUrl: getStringValue(formData, "applyUrl"),
    applyEmail: getStringValue(formData, "applyEmail"),
    applyTelegram: getStringValue(formData, "applyTelegram"),
    expiresAtInput: getStringValue(formData, "expiresAtInput"),
  });

  if (!parsed.success) {
    redirectWithError("/jobs/post", parsed.error.issues[0]?.message ?? "Invalid job input.");
  }

  const user = await requireUser();
  if (!isAdminUser(user)) {
    redirectWithError("/jobs", "Not authorized.");
  }

  const expiresAtIso = nuLocalDateTimeToUtcIso(parsed.data.expiresAtInput);
  if (!expiresAtIso) {
    redirectWithError("/jobs/post", "Invalid expiration date and time.");
  }

  const supabase = await createClient();
  const { data: created, error } = await supabase
    .from("jobs")
    .insert({
      created_by: user.id,
      title: parsed.data.title,
      organization_name: parsed.data.organizationName,
      job_type: parsed.data.jobType,
      location_mode: parsed.data.locationMode,
      location_text: parsed.data.locationText,
      description: parsed.data.description,
      requirements: parsed.data.requirements,
      compensation_text: parsed.data.compensationText,
      apply_method: parsed.data.applyMethod,
      ...toApplyPayload(parsed.data),
      status: "pending_review",
      is_hidden: false,
      expires_at: expiresAtIso,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    redirectWithError("/jobs/post", "Failed to create job.");
  }

  if (!created) {
    redirectWithError("/jobs/post", "Failed to create job.");
  }

  revalidateJobPaths(created.id);
  redirectWithMessage(`/jobs/${created.id}`, "Job submitted for review.");
}

export async function updateJobAction(formData: FormData) {
  assertJobsBoardEnabled("/jobs");
  const parsedJobId = jobMutationIdSchema.safeParse({
    jobId: getStringValue(formData, "jobId"),
  });

  if (!parsedJobId.success) {
    redirectWithError("/jobs", parsedJobId.error.issues[0]?.message ?? "Invalid job id.");
  }

  const jobId = parsedJobId.data.jobId;
  const editPath = `/jobs/${jobId}/edit`;
  const parsed = updateJobSchema.safeParse({
    title: getStringValue(formData, "title"),
    organizationName: getStringValue(formData, "organizationName"),
    jobType: getStringValue(formData, "jobType"),
    locationMode: getStringValue(formData, "locationMode"),
    locationText: getStringValue(formData, "locationText"),
    description: getStringValue(formData, "description"),
    requirements: getStringValue(formData, "requirements"),
    compensationText: getStringValue(formData, "compensationText"),
    applyMethod: getStringValue(formData, "applyMethod"),
    applyUrl: getStringValue(formData, "applyUrl"),
    applyEmail: getStringValue(formData, "applyEmail"),
    applyTelegram: getStringValue(formData, "applyTelegram"),
    expiresAtInput: getStringValue(formData, "expiresAtInput"),
  });

  if (!parsed.success) {
    redirectWithError(editPath, parsed.error.issues[0]?.message ?? "Invalid job input.");
  }

  const user = await requireUser();
  if (!isAdminUser(user)) {
    redirectWithError("/jobs", "Not authorized.");
  }

  const expiresAtIso = nuLocalDateTimeToUtcIso(parsed.data.expiresAtInput);
  if (!expiresAtIso) {
    redirectWithError(editPath, "Invalid expiration date and time.");
  }

  const supabase = await createClient();
  const { data: updated, error } = await supabase
    .from("jobs")
    .update({
      title: parsed.data.title,
      organization_name: parsed.data.organizationName,
      job_type: parsed.data.jobType,
      location_mode: parsed.data.locationMode,
      location_text: parsed.data.locationText,
      description: parsed.data.description,
      requirements: parsed.data.requirements,
      compensation_text: parsed.data.compensationText,
      apply_method: parsed.data.applyMethod,
      ...toApplyPayload(parsed.data),
      expires_at: expiresAtIso,
    })
    .eq("id", jobId)
    .select("id")
    .maybeSingle();

  if (error) {
    redirectWithError(editPath, "Failed to update job.");
  }

  if (!updated) {
    redirectWithError(editPath, "Job not found.");
  }

  revalidateJobPaths(jobId);
  redirectWithMessage(`/jobs/${jobId}`, "Job updated.");
}

export async function approveJobAction(formData: FormData) {
  assertJobsBoardEnabled("/profile/moderation");
  const parsed = moderateJobSchema.safeParse({
    jobId: getStringValue(formData, "jobId"),
    redirectTo: getStringValue(formData, "redirectTo"),
  });

  if (!parsed.success) {
    redirectWithError("/profile/moderation", parsed.error.issues[0]?.message ?? "Invalid job id.");
  }

  const redirectPath = sanitizeInternalPath(parsed.data.redirectTo, "/profile/moderation");
  const user = await requireUser();
  if (!isAdminUser(user)) {
    redirectWithError(redirectPath, "Not authorized.");
  }

  const supabase = await createClient();
  const { data: approved, error } = await supabase
    .from("jobs")
    .update({
      status: "published",
      is_hidden: false,
    })
    .eq("id", parsed.data.jobId)
    .select("id")
    .maybeSingle();

  if (error) {
    redirectWithError(redirectPath, "Failed to approve job.");
  }

  if (!approved) {
    redirectWithError(redirectPath, "Job not found.");
  }

  revalidateJobPaths(parsed.data.jobId);
  redirectWithMessage(redirectPath, "Job approved.");
}

export async function rejectJobAction(formData: FormData) {
  assertJobsBoardEnabled("/profile/moderation");
  const parsed = moderateJobSchema.safeParse({
    jobId: getStringValue(formData, "jobId"),
    redirectTo: getStringValue(formData, "redirectTo"),
  });

  if (!parsed.success) {
    redirectWithError("/profile/moderation", parsed.error.issues[0]?.message ?? "Invalid job id.");
  }

  const redirectPath = sanitizeInternalPath(parsed.data.redirectTo, "/profile/moderation");
  const user = await requireUser();
  if (!isAdminUser(user)) {
    redirectWithError(redirectPath, "Not authorized.");
  }

  const supabase = await createClient();
  const { data: rejected, error } = await supabase
    .from("jobs")
    .update({
      status: "rejected",
    })
    .eq("id", parsed.data.jobId)
    .select("id")
    .maybeSingle();

  if (error) {
    redirectWithError(redirectPath, "Failed to reject job.");
  }

  if (!rejected) {
    redirectWithError(redirectPath, "Job not found.");
  }

  revalidateJobPaths(parsed.data.jobId);
  redirectWithMessage(redirectPath, "Job rejected.");
}

export async function setJobHiddenAction(formData: FormData) {
  assertJobsBoardEnabled("/profile/moderation");
  const parsed = setJobHiddenSchema.safeParse({
    jobId: getStringValue(formData, "jobId"),
    isHiddenInput: getStringValue(formData, "isHiddenInput"),
    redirectTo: getStringValue(formData, "redirectTo"),
  });

  if (!parsed.success) {
    redirectWithError("/profile/moderation", parsed.error.issues[0]?.message ?? "Invalid hidden input.");
  }

  const redirectPath = sanitizeInternalPath(parsed.data.redirectTo, "/profile/moderation");
  const user = await requireUser();
  if (!isAdminUser(user)) {
    redirectWithError(redirectPath, "Not authorized.");
  }

  const isHidden = parsed.data.isHiddenInput === "true";
  const supabase = await createClient();
  const { data: updated, error } = await supabase
    .from("jobs")
    .update({
      is_hidden: isHidden,
    })
    .eq("id", parsed.data.jobId)
    .select("id")
    .maybeSingle();

  if (error) {
    redirectWithError(redirectPath, "Failed to update hidden status.");
  }

  if (!updated) {
    redirectWithError(redirectPath, "Job not found.");
  }

  revalidateJobPaths(parsed.data.jobId);
  redirectWithMessage(redirectPath, isHidden ? "Job hidden." : "Job unhidden.");
}
