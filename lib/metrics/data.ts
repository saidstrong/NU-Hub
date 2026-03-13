import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type MetricsClient = SupabaseClient<Database>;
export type DailyMetricsRow = Database["public"]["Tables"]["daily_metrics"]["Row"];

const DAY_INPUT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export type DailyMetricsAggregate = {
  day: string;
  activeUsers: number;
  newUsers: number;
  friendMessages: number;
  marketplaceMessages: number;
  listingsCreated: number;
  communityPosts: number;
  eventRsvps: number;
  notificationsCreated: number;
  moderationReports: number;
  rateLimitHits: number;
};

function assertValidUtcDay(day: string) {
  if (!DAY_INPUT_PATTERN.test(day)) {
    throw new Error("Day must be in YYYY-MM-DD format.");
  }

  const parsedDay = new Date(`${day}T00:00:00.000Z`);
  if (Number.isNaN(parsedDay.getTime()) || parsedDay.toISOString().slice(0, 10) !== day) {
    throw new Error("Invalid UTC day.");
  }
}

function getUtcDayBounds(day: string) {
  assertValidUtcDay(day);
  const start = new Date(`${day}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}

async function resolveClient(client?: MetricsClient): Promise<MetricsClient> {
  return client ?? createClient();
}

export function isValidUtcDay(day: string): boolean {
  try {
    assertValidUtcDay(day);
    return true;
  } catch {
    return false;
  }
}

export function getYesterdayUtcDay(referenceDate = new Date()): string {
  const date = new Date(referenceDate);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

export async function aggregateDailyMetricsForDay(
  day: string,
  client?: MetricsClient,
): Promise<DailyMetricsAggregate> {
  const { startIso, endIso } = getUtcDayBounds(day);
  const supabase = await resolveClient(client);

  const [
    friendMessagesResult,
    marketplaceMessagesResult,
    listingsResult,
    communityPostsResult,
    eventParticipantsResult,
    notificationsResult,
    contentReportsResult,
    newUsersCountResult,
    rateLimitEventsCountResult,
  ] = await Promise.all([
    supabase
      .from("friend_messages")
      .select("sender_id")
      .gte("created_at", startIso)
      .lt("created_at", endIso),
    supabase
      .from("messages")
      .select("sender_id")
      .gte("created_at", startIso)
      .lt("created_at", endIso),
    supabase
      .from("listings")
      .select("seller_id")
      .gte("created_at", startIso)
      .lt("created_at", endIso),
    supabase
      .from("community_posts")
      .select("author_id")
      .gte("created_at", startIso)
      .lt("created_at", endIso),
    supabase
      .from("event_participants")
      .select("user_id")
      .gte("created_at", startIso)
      .lt("created_at", endIso),
    supabase
      .from("notifications")
      .select("user_id")
      .gte("created_at", startIso)
      .lt("created_at", endIso),
    supabase
      .from("content_reports")
      .select("reporter_id")
      .gte("created_at", startIso)
      .lt("created_at", endIso),
    supabase
      .from("profiles")
      .select("user_id", { count: "exact", head: true })
      .gte("created_at", startIso)
      .lt("created_at", endIso),
    supabase
      .from("rate_limit_events")
      .select("id", { count: "exact", head: true })
      .gte("created_at", startIso)
      .lt("created_at", endIso),
  ]);

  if (
    friendMessagesResult.error ||
    marketplaceMessagesResult.error ||
    listingsResult.error ||
    communityPostsResult.error ||
    eventParticipantsResult.error ||
    notificationsResult.error ||
    contentReportsResult.error ||
    newUsersCountResult.error ||
    rateLimitEventsCountResult.error
  ) {
    throw new Error("Failed to aggregate daily metrics.");
  }

  // Approximation: DAU is derived from distinct actors who generated interactions on the day.
  const activeUserIds = new Set<string>();

  for (const row of friendMessagesResult.data ?? []) activeUserIds.add(row.sender_id);
  for (const row of marketplaceMessagesResult.data ?? []) activeUserIds.add(row.sender_id);
  for (const row of listingsResult.data ?? []) activeUserIds.add(row.seller_id);
  for (const row of communityPostsResult.data ?? []) activeUserIds.add(row.author_id);
  for (const row of eventParticipantsResult.data ?? []) activeUserIds.add(row.user_id);
  for (const row of notificationsResult.data ?? []) activeUserIds.add(row.user_id);
  for (const row of contentReportsResult.data ?? []) activeUserIds.add(row.reporter_id);

  return {
    day,
    activeUsers: activeUserIds.size,
    newUsers: newUsersCountResult.count ?? 0,
    friendMessages: (friendMessagesResult.data ?? []).length,
    marketplaceMessages: (marketplaceMessagesResult.data ?? []).length,
    listingsCreated: (listingsResult.data ?? []).length,
    communityPosts: (communityPostsResult.data ?? []).length,
    eventRsvps: (eventParticipantsResult.data ?? []).length,
    notificationsCreated: (notificationsResult.data ?? []).length,
    moderationReports: (contentReportsResult.data ?? []).length,
    rateLimitHits: rateLimitEventsCountResult.count ?? 0,
  };
}

export async function upsertDailyMetricsRow(
  aggregate: DailyMetricsAggregate,
  client?: MetricsClient,
): Promise<DailyMetricsRow> {
  const supabase = await resolveClient(client);
  const { data, error } = await supabase
    .from("daily_metrics")
    .upsert(
      {
        day: aggregate.day,
        active_users: aggregate.activeUsers,
        new_users: aggregate.newUsers,
        friend_messages: aggregate.friendMessages,
        marketplace_messages: aggregate.marketplaceMessages,
        listings_created: aggregate.listingsCreated,
        community_posts: aggregate.communityPosts,
        event_rsvps: aggregate.eventRsvps,
        notifications_created: aggregate.notificationsCreated,
        moderation_reports: aggregate.moderationReports,
        rate_limit_hits: aggregate.rateLimitHits,
      },
      { onConflict: "day" },
    )
    .select("*")
    .single();

  if (error || !data) {
    throw new Error("Failed to upsert daily metrics.");
  }

  return data;
}

export async function getRecentDailyMetrics(
  limit = 30,
  client?: MetricsClient,
): Promise<DailyMetricsRow[]> {
  const supabase = await resolveClient(client);
  const safeLimit = Math.max(1, Math.min(limit, 120));

  const { data, error } = await supabase
    .from("daily_metrics")
    .select("*")
    .order("day", { ascending: false })
    .limit(safeLimit);

  if (error) {
    throw new Error("Failed to load daily metrics.");
  }

  return data ?? [];
}
