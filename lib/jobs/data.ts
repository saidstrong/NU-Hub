import { requireUser } from "@/lib/auth/session";
import { createPaginationWindow, splitPaginatedRows } from "@/lib/pagination";
import { createClient } from "@/lib/supabase/server";
import { sanitizeSearchQuery, toIlikePattern } from "@/lib/validation/search";
import type { Database } from "@/types/database";

export type JobRow = Database["public"]["Tables"]["jobs"]["Row"];
export type JobType = JobRow["job_type"];
export type JobLocationMode = JobRow["location_mode"];
export type JobApplyMethod = JobRow["apply_method"];
export type JobStatus = JobRow["status"];

export type JobListItem = Pick<
  JobRow,
  | "id"
  | "title"
  | "organization_name"
  | "job_type"
  | "location_mode"
  | "location_text"
  | "compensation_text"
  | "apply_method"
  | "expires_at"
  | "created_at"
>;

export type PendingJobReviewItem = Pick<
  JobRow,
  | "id"
  | "title"
  | "organization_name"
  | "job_type"
  | "location_mode"
  | "status"
  | "is_hidden"
  | "expires_at"
  | "created_at"
>;

type PublishedJobsQueryInput = {
  query?: string;
  jobType?: JobType;
  locationMode?: JobLocationMode;
  page?: number;
  pageSize?: number;
};

type PublishedJobsPageResult = {
  jobs: JobListItem[];
  hasMore: boolean;
};

const JOB_LIST_SELECT =
  "id, title, organization_name, job_type, location_mode, location_text, compensation_text, apply_method, expires_at, created_at";

function isAdminUser(user: Awaited<ReturnType<typeof requireUser>>): boolean {
  const metadata = user.app_metadata;
  if (!metadata || typeof metadata !== "object") {
    return false;
  }

  return (metadata as Record<string, unknown>).role === "admin";
}

export function isJobExpired(expiresAt: string): boolean {
  return new Date(expiresAt).getTime() <= Date.now();
}

export function formatJobTypeLabel(jobType: JobType): string {
  if (jobType === "part_time") return "Part-time";
  if (jobType === "volunteer") return "Volunteer";
  if (jobType === "research") return "Research";
  return "Internship";
}

export function formatJobLocationModeLabel(locationMode: JobLocationMode): string {
  if (locationMode === "on_campus") return "On campus";
  if (locationMode === "off_campus") return "Off campus";
  if (locationMode === "hybrid") return "Hybrid";
  return "Remote";
}

export function formatJobApplyMethodLabel(applyMethod: JobApplyMethod): string {
  if (applyMethod === "email") return "Email";
  if (applyMethod === "telegram") return "Telegram";
  return "External link";
}

export function formatJobStatusLabel(status: JobStatus): string {
  if (status === "pending_review") return "Pending review";
  if (status === "published") return "Published";
  return "Rejected";
}

export async function getPublishedJobsPage(
  input: PublishedJobsQueryInput = {},
): Promise<PublishedJobsPageResult> {
  await requireUser();
  const {
    page = 1,
    pageSize = 12,
    query,
    jobType,
    locationMode,
  } = input;
  const { from, to, pageSize: safePageSize } = createPaginationWindow({
    page,
    pageSize,
    defaultPageSize: 12,
    maxPageSize: 30,
  });
  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  let queryBuilder = supabase
    .from("jobs")
    .select(JOB_LIST_SELECT)
    .eq("status", "published")
    .eq("is_hidden", false)
    .gt("expires_at", nowIso);

  if (jobType) {
    queryBuilder = queryBuilder.eq("job_type", jobType);
  }

  if (locationMode) {
    queryBuilder = queryBuilder.eq("location_mode", locationMode);
  }

  const normalizedQuery = query ? sanitizeSearchQuery(query) : "";
  if (normalizedQuery.length > 0) {
    const pattern = toIlikePattern(normalizedQuery);
    queryBuilder = queryBuilder.or(
      `title.ilike.${pattern},organization_name.ilike.${pattern},description.ilike.${pattern}`,
    );
  }

  const { data, error } = await queryBuilder
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, to);

  if (error) {
    throw new Error("Failed to load jobs.");
  }

  const paged = splitPaginatedRows(data, safePageSize);

  return {
    jobs: paged.rows as JobListItem[],
    hasMore: paged.hasMore,
  };
}

export async function getPublishedJobDetail(jobId: string): Promise<JobRow | null> {
  const user = await requireUser();
  const admin = isAdminUser(user);
  const supabase = await createClient();

  const { data: job, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", jobId)
    .maybeSingle();

  if (error) {
    throw new Error("Failed to load job.");
  }

  if (!job) return null;

  const isPubliclyVisible =
    job.status === "published" && !job.is_hidden && !isJobExpired(job.expires_at);

  if (!isPubliclyVisible && !admin) {
    return null;
  }

  return job;
}

export async function getPendingJobsForReview(limit = 50): Promise<PendingJobReviewItem[]> {
  const user = await requireUser();
  if (!isAdminUser(user)) {
    throw new Error("Not authorized to review pending jobs.");
  }

  const safeLimit = Math.max(1, Math.min(limit, 100));
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("jobs")
    .select("id, title, organization_name, job_type, location_mode, status, is_hidden, expires_at, created_at")
    .eq("status", "pending_review")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(safeLimit);

  if (error) {
    throw new Error("Failed to load pending jobs.");
  }

  return (data ?? []) as PendingJobReviewItem[];
}

export async function getJobForAdminEdit(jobId: string): Promise<JobRow | null> {
  const user = await requireUser();
  if (!isAdminUser(user)) {
    throw new Error("Not authorized to edit jobs.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", jobId)
    .maybeSingle();

  if (error) {
    throw new Error("Failed to load job.");
  }

  return data;
}
