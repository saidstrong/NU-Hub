import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import type { ModerationTargetType } from "@/lib/validation/moderation";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

type ListingTargetRow = Pick<
  Database["public"]["Tables"]["listings"]["Row"],
  "id" | "title" | "seller_id" | "is_hidden"
>;

type EventTargetRow = Pick<
  Database["public"]["Tables"]["events"]["Row"],
  "id" | "title" | "created_by" | "is_hidden"
>;

type CommunityTargetRow = Pick<
  Database["public"]["Tables"]["communities"]["Row"],
  "id" | "name" | "created_by" | "is_hidden"
>;

type CommunityPostTargetRow = Pick<
  Database["public"]["Tables"]["community_posts"]["Row"],
  "id" | "community_id" | "author_id" | "content" | "is_hidden"
>;

type ReporterProfile = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "user_id" | "full_name"
>;

export type ModerationTargetLookup = {
  targetType: ModerationTargetType;
  targetId: string;
  ownerId: string | null;
  isHidden: boolean;
  communityId: string | null;
};

export type ModerationReportListItem = {
  id: string;
  reporterId: string;
  reporterName: string;
  targetType: ModerationTargetType;
  targetId: string;
  reason: Database["public"]["Tables"]["content_reports"]["Row"]["reason"];
  note: string | null;
  createdAt: string;
  targetExists: boolean;
  targetLabel: string;
  targetLink: string | null;
  targetHidden: boolean | null;
  targetCommunityId: string | null;
};

type AdminUser = Awaited<ReturnType<typeof requireUser>>;

function dedupe(values: string[]): string[] {
  return Array.from(new Set(values));
}

function normalizeName(fullName: string | null | undefined): string {
  const normalized = fullName?.trim();
  return normalized && normalized.length > 0 ? normalized : "NU student";
}

function previewText(value: string, max = 90): string {
  const normalized = value.trim().replace(/\s+/g, " ");
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max)}...`;
}

export function isAdminUser(user: Pick<AdminUser, "app_metadata"> | null): boolean {
  const metadata = user?.app_metadata;
  if (!metadata || typeof metadata !== "object") {
    return false;
  }

  const role = (metadata as Record<string, unknown>).role;
  return role === "admin";
}

export async function requireAdminUser(): Promise<AdminUser | null> {
  const user = await requireUser();
  return isAdminUser(user) ? user : null;
}

export function getModerationTargetPath(
  targetType: ModerationTargetType,
  targetId: string,
  options: { communityId?: string | null } = {},
): string {
  if (targetType === "listing") {
    return `/market/item/${targetId}`;
  }

  if (targetType === "event") {
    return `/events/${targetId}`;
  }

  if (targetType === "community") {
    return `/connect/communities/${targetId}`;
  }

  if (options.communityId) {
    return `/connect/communities/${options.communityId}`;
  }

  return "/connect/communities";
}

export async function getModerationTargetLookup(
  supabase: SupabaseServerClient,
  targetType: ModerationTargetType,
  targetId: string,
): Promise<ModerationTargetLookup | null> {
  if (targetType === "listing") {
    const { data, error } = await supabase
      .from("listings")
      .select("id, seller_id, is_hidden")
      .eq("id", targetId)
      .maybeSingle();

    if (error) {
      throw new Error("Failed to load listing target.");
    }

    if (!data) return null;

    return {
      targetType,
      targetId: data.id,
      ownerId: data.seller_id,
      isHidden: data.is_hidden,
      communityId: null,
    };
  }

  if (targetType === "event") {
    const { data, error } = await supabase
      .from("events")
      .select("id, created_by, is_hidden")
      .eq("id", targetId)
      .maybeSingle();

    if (error) {
      throw new Error("Failed to load event target.");
    }

    if (!data) return null;

    return {
      targetType,
      targetId: data.id,
      ownerId: data.created_by,
      isHidden: data.is_hidden,
      communityId: null,
    };
  }

  if (targetType === "community") {
    const { data, error } = await supabase
      .from("communities")
      .select("id, created_by, is_hidden")
      .eq("id", targetId)
      .maybeSingle();

    if (error) {
      throw new Error("Failed to load community target.");
    }

    if (!data) return null;

    return {
      targetType,
      targetId: data.id,
      ownerId: data.created_by,
      isHidden: data.is_hidden,
      communityId: null,
    };
  }

  const { data, error } = await supabase
    .from("community_posts")
    .select("id, author_id, community_id, is_hidden")
    .eq("id", targetId)
    .maybeSingle();

  if (error) {
    throw new Error("Failed to load community post target.");
  }

  if (!data) return null;

  return {
    targetType,
    targetId: data.id,
    ownerId: data.author_id,
    isHidden: data.is_hidden,
    communityId: data.community_id,
  };
}

export async function getRecentContentReports(limit = 60): Promise<ModerationReportListItem[]> {
  const adminUser = await requireAdminUser();

  if (!adminUser) {
    throw new Error("Not authorized to review reports.");
  }

  const supabase = await createClient();
  const { data: reportRows, error: reportError } = await supabase
    .from("content_reports")
    .select("id, reporter_id, target_type, target_id, reason, note, created_at")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit);

  if (reportError) {
    throw new Error("Failed to load reports.");
  }

  const rows = reportRows ?? [];

  if (rows.length === 0) {
    return [];
  }

  const listingIds: string[] = [];
  const eventIds: string[] = [];
  const communityIdsFromReports: string[] = [];
  const postIds: string[] = [];
  const reporterIds = dedupe(rows.map((row) => row.reporter_id));

  for (const row of rows) {
    if (row.target_type === "listing") {
      listingIds.push(row.target_id);
      continue;
    }

    if (row.target_type === "event") {
      eventIds.push(row.target_id);
      continue;
    }

    if (row.target_type === "community") {
      communityIdsFromReports.push(row.target_id);
      continue;
    }

    if (row.target_type === "community_post") {
      postIds.push(row.target_id);
    }
  }

  const [reportersResult, listingsResult, eventsResult, postsResult] = await Promise.all([
    reporterIds.length > 0
      ? supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", reporterIds)
      : Promise.resolve({
          data: [] as ReporterProfile[],
          error: null,
        }),
    listingIds.length > 0
      ? supabase
          .from("listings")
          .select("id, title, seller_id, is_hidden")
          .in("id", dedupe(listingIds))
      : Promise.resolve({
          data: [] as ListingTargetRow[],
          error: null,
        }),
    eventIds.length > 0
      ? supabase
          .from("events")
          .select("id, title, created_by, is_hidden")
          .in("id", dedupe(eventIds))
      : Promise.resolve({
          data: [] as EventTargetRow[],
          error: null,
        }),
    postIds.length > 0
      ? supabase
          .from("community_posts")
          .select("id, community_id, author_id, content, is_hidden")
          .in("id", dedupe(postIds))
      : Promise.resolve({
          data: [] as CommunityPostTargetRow[],
          error: null,
        }),
  ]);

  if (reportersResult.error || listingsResult.error || eventsResult.error || postsResult.error) {
    throw new Error("Failed to load report metadata.");
  }

  const postCommunityIds = dedupe((postsResult.data ?? []).map((post) => post.community_id));
  const communityIds = dedupe([...communityIdsFromReports, ...postCommunityIds]);
  const communitiesResult = communityIds.length > 0
    ? await supabase
        .from("communities")
        .select("id, name, created_by, is_hidden")
        .in("id", communityIds)
    : {
        data: [] as CommunityTargetRow[],
        error: null,
      };

  if (communitiesResult.error) {
    throw new Error("Failed to load community report metadata.");
  }

  const reporterMap = new Map((reportersResult.data ?? []).map((row) => [row.user_id, row]));
  const listingMap = new Map((listingsResult.data ?? []).map((row) => [row.id, row]));
  const eventMap = new Map((eventsResult.data ?? []).map((row) => [row.id, row]));
  const communityMap = new Map((communitiesResult.data ?? []).map((row) => [row.id, row]));
  const postMap = new Map((postsResult.data ?? []).map((row) => [row.id, row]));

  return rows.map((report): ModerationReportListItem => {
    const reporter = reporterMap.get(report.reporter_id);
    const reporterName = normalizeName(reporter?.full_name);

    if (report.target_type === "listing") {
      const listing = listingMap.get(report.target_id);
      if (!listing) {
        return {
          id: report.id,
          reporterId: report.reporter_id,
          reporterName,
          targetType: report.target_type,
          targetId: report.target_id,
          reason: report.reason,
          note: report.note,
          createdAt: report.created_at,
          targetExists: false,
          targetLabel: "Listing removed",
          targetLink: null,
          targetHidden: null,
          targetCommunityId: null,
        };
      }

      return {
        id: report.id,
        reporterId: report.reporter_id,
        reporterName,
        targetType: report.target_type,
        targetId: report.target_id,
        reason: report.reason,
        note: report.note,
        createdAt: report.created_at,
        targetExists: true,
        targetLabel: listing.title,
        targetLink: getModerationTargetPath("listing", listing.id),
        targetHidden: listing.is_hidden,
        targetCommunityId: null,
      };
    }

    if (report.target_type === "event") {
      const event = eventMap.get(report.target_id);
      if (!event) {
        return {
          id: report.id,
          reporterId: report.reporter_id,
          reporterName,
          targetType: report.target_type,
          targetId: report.target_id,
          reason: report.reason,
          note: report.note,
          createdAt: report.created_at,
          targetExists: false,
          targetLabel: "Event removed",
          targetLink: null,
          targetHidden: null,
          targetCommunityId: null,
        };
      }

      return {
        id: report.id,
        reporterId: report.reporter_id,
        reporterName,
        targetType: report.target_type,
        targetId: report.target_id,
        reason: report.reason,
        note: report.note,
        createdAt: report.created_at,
        targetExists: true,
        targetLabel: event.title,
        targetLink: getModerationTargetPath("event", event.id),
        targetHidden: event.is_hidden,
        targetCommunityId: null,
      };
    }

    if (report.target_type === "community") {
      const community = communityMap.get(report.target_id);
      if (!community) {
        return {
          id: report.id,
          reporterId: report.reporter_id,
          reporterName,
          targetType: report.target_type,
          targetId: report.target_id,
          reason: report.reason,
          note: report.note,
          createdAt: report.created_at,
          targetExists: false,
          targetLabel: "Community removed",
          targetLink: null,
          targetHidden: null,
          targetCommunityId: null,
        };
      }

      return {
        id: report.id,
        reporterId: report.reporter_id,
        reporterName,
        targetType: report.target_type,
        targetId: report.target_id,
        reason: report.reason,
        note: report.note,
        createdAt: report.created_at,
        targetExists: true,
        targetLabel: community.name,
        targetLink: getModerationTargetPath("community", community.id),
        targetHidden: community.is_hidden,
        targetCommunityId: community.id,
      };
    }

    const post = postMap.get(report.target_id);
    if (!post) {
      return {
        id: report.id,
        reporterId: report.reporter_id,
        reporterName,
        targetType: report.target_type,
        targetId: report.target_id,
        reason: report.reason,
        note: report.note,
        createdAt: report.created_at,
        targetExists: false,
        targetLabel: "Community post removed",
        targetLink: null,
        targetHidden: null,
        targetCommunityId: null,
      };
    }

    const community = communityMap.get(post.community_id);
    const postLabel = `Post in ${community?.name ?? "community"}: ${previewText(post.content)}`;

    return {
      id: report.id,
      reporterId: report.reporter_id,
      reporterName,
      targetType: report.target_type,
      targetId: report.target_id,
      reason: report.reason,
      note: report.note,
      createdAt: report.created_at,
      targetExists: true,
      targetLabel: postLabel,
      targetLink: getModerationTargetPath("community_post", post.id, { communityId: post.community_id }),
      targetHidden: post.is_hidden,
      targetCommunityId: post.community_id,
    };
  });
}
