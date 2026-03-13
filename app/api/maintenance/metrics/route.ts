import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  aggregateDailyMetricsForDay,
  getYesterdayUtcDay,
  isValidUtcDay,
  upsertDailyMetricsRow,
} from "@/lib/metrics/data";
import { getDurationMs, logError, logInfo } from "@/lib/observability/logger";
import { getRequestContext } from "@/lib/observability/request-context";
import type { Database } from "@/types/database";

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

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function GET(request: NextRequest) {
  const requestContext = await getRequestContext({
    action: "metricsAggregationCron",
    route: "/api/maintenance/metrics",
  });

  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dayParam = request.nextUrl.searchParams.get("day");
  const day = dayParam ?? getYesterdayUtcDay();

  if (dayParam && !isValidUtcDay(dayParam)) {
    return Response.json({ error: "Invalid day. Use YYYY-MM-DD." }, { status: 400 });
  }

  const startedAt = performance.now();

  logInfo("metrics", "metrics_aggregation_start", {
    ...requestContext,
    day,
  });

  try {
    const supabase = createServiceRoleClient();
    const aggregate = await aggregateDailyMetricsForDay(day, supabase);
    const upserted = await upsertDailyMetricsRow(aggregate, supabase);

    const summary = {
      day: upserted.day,
      activeUsers: upserted.active_users,
      newUsers: upserted.new_users,
      friendMessages: upserted.friend_messages,
      marketplaceMessages: upserted.marketplace_messages,
      listingsCreated: upserted.listings_created,
      communityPosts: upserted.community_posts,
      eventRsvps: upserted.event_rsvps,
      notificationsCreated: upserted.notifications_created,
      moderationReports: upserted.moderation_reports,
      rateLimitHits: upserted.rate_limit_hits,
    };

    const durationMs = getDurationMs(startedAt);
    logInfo("metrics", "metrics_aggregation_complete", {
      ...requestContext,
      durationMs,
      ...summary,
    });

    return Response.json(summary, { status: 200 });
  } catch (error) {
    const durationMs = getDurationMs(startedAt);
    logError("metrics", "metrics_aggregation_failed", {
      ...requestContext,
      day,
      durationMs,
      error: error instanceof Error ? error.message : "Unknown metrics aggregation error",
    });
    return Response.json({ error: "Metrics aggregation failed." }, { status: 500 });
  }
}
