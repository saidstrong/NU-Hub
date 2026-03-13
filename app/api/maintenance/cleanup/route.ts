import type { NextRequest } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import {
  buildUploadReconciliationReport,
  cleanupReadNotifications,
  cleanupStaleDrafts,
  cleanupStaleEmptyConversations,
} from "@/lib/maintenance/cleanup";
import { getDurationMs, logError, logInfo } from "@/lib/observability/logger";
import { getRequestContext } from "@/lib/observability/request-context";
import type { Database } from "@/types/database";

function parseBooleanQueryParam(value: string | null): boolean | null {
  if (!value) return null;
  if (value === "true" || value === "1") return true;
  if (value === "false" || value === "0") return false;
  return null;
}

function parseIntegerQueryParam(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.floor(parsed);
}

function isAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;

  const authHeader = request.headers.get("authorization");
  if (!authHeader) return false;

  return authHeader === `Bearer ${cronSecret}`;
}

function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Missing Supabase service role configuration.");
  }

  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function GET(request: NextRequest) {
  const requestContext = await getRequestContext({
    action: "maintenanceCleanupCron",
    route: "/api/maintenance/cleanup",
  });

  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const startedAt = performance.now();

  const hasDryRunParam = searchParams.has("dryRun");
  const hasAllowDeleteParam = searchParams.has("allowDelete");
  const hasAnyQueryParams = searchParams.size > 0;

  let dryRun = false;
  let allowDelete = true;
  let runMode: "cron_default" | "manual_preview" | "manual_destructive" = "cron_default";

  if (!hasAnyQueryParams) {
    dryRun = false;
    allowDelete = true;
    runMode = "cron_default";
  } else {
    const dryRunValue = parseBooleanQueryParam(searchParams.get("dryRun"));

    if (hasDryRunParam && dryRunValue === true) {
      dryRun = true;
      allowDelete = false;
      runMode = "manual_preview";
    } else if (
      hasDryRunParam &&
      dryRunValue === false &&
      hasAllowDeleteParam &&
      parseBooleanQueryParam(searchParams.get("allowDelete")) === true
    ) {
      dryRun = false;
      allowDelete = true;
      runMode = "manual_destructive";
    } else {
      return Response.json(
        {
          error:
            "Invalid execution mode. Use no query params for cron default, ?dryRun=true for preview, or ?dryRun=false&allowDelete=true for manual destructive run.",
        },
        { status: 400 },
      );
    }
  }

  const limit = parseIntegerQueryParam(searchParams.get("limit"));
  const olderThanDays = parseIntegerQueryParam(searchParams.get("olderThanDays"));

  const options = {
    dryRun,
    allowDelete,
    ...(limit !== null ? { limit } : {}),
    ...(olderThanDays !== null ? { olderThanDays } : {}),
  };

  logInfo("maintenance", "maintenance_start", {
    ...requestContext,
    dryRun: options.dryRun,
    allowDelete: options.allowDelete,
    limit: options.limit ?? null,
    olderThanDays: options.olderThanDays ?? null,
    mode: runMode,
  });

  try {
    const supabase = createServiceRoleClient();
    const notifications = await cleanupReadNotifications(options, supabase);
    const drafts = await cleanupStaleDrafts(options, supabase);
    const conversations = await cleanupStaleEmptyConversations(options, supabase);
    const uploads = await buildUploadReconciliationReport(
      {
        ...(limit !== null ? { limit } : {}),
      },
      supabase,
    );

    const summary = {
      notificationsCleaned: notifications.deleted,
      draftsRemoved: drafts.listings.deleted + drafts.events.deleted,
      emptyConversationsRemoved:
        conversations.marketConversations.deleted + conversations.friendConversations.deleted,
      uploadReportGenerated: true,
    };

    const durationMs = getDurationMs(startedAt);
    logInfo("maintenance", "maintenance_complete", {
      ...requestContext,
      durationMs,
      ...summary,
      mode: runMode,
      notificationCandidates: notifications.candidates,
      draftCandidates: drafts.listings.candidates + drafts.events.candidates,
      emptyConversationCandidates:
        conversations.marketConversations.candidates + conversations.friendConversations.candidates,
      uploadAnomalies:
        uploads.orphanedListingImageRows.length +
        uploads.suspiciousProfileAvatarPaths.length +
        uploads.suspiciousCommunityAvatarPaths.length +
        uploads.suspiciousEventCoverPaths.length,
    });

    return Response.json(summary, { status: 200 });
  } catch (error) {
    const durationMs = getDurationMs(startedAt);
    logError("maintenance", "maintenance_failed", {
      ...requestContext,
      durationMs,
      dryRun: options.dryRun,
      allowDelete: options.allowDelete,
      mode: runMode,
      error: error instanceof Error ? error.message : String(error),
    });

    return Response.json({ error: "Maintenance job failed." }, { status: 500 });
  }
}
