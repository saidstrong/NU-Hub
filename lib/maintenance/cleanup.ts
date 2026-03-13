import { createClient } from "@/lib/supabase/server";
import { isSafeStoragePath } from "@/lib/validation/media";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type CleanupRunOptions = {
  dryRun?: boolean;
  allowDelete?: boolean;
  limit?: number;
  olderThanDays?: number;
};

type CleanupMode = {
  dryRun: boolean;
  shouldDelete: boolean;
  limit: number;
  olderThanDays: number;
  cutoffIso: string;
};

export type CleanupSummary = {
  dryRun: boolean;
  shouldDelete: boolean;
  limit: number;
  olderThanDays: number;
  cutoffIso: string;
  scanned: number;
  candidates: number;
  deleted: number;
  candidateIds: string[];
};

export type DraftCleanupSummary = {
  listings: CleanupSummary;
  events: CleanupSummary;
};

export type ConversationCleanupSummary = {
  marketConversations: CleanupSummary;
  friendConversations: CleanupSummary;
};

export type UploadReconciliationReport = {
  limit: number;
  generatedAt: string;
  listingImageRowsScanned: number;
  orphanedListingImageRows: Array<{
    listingImageId: string;
    listingId: string;
    storagePath: string;
  }>;
  suspiciousProfileAvatarPaths: Array<{
    userId: string;
    storagePath: string;
  }>;
  suspiciousCommunityAvatarPaths: Array<{
    communityId: string;
    storagePath: string;
  }>;
  suspiciousEventCoverPaths: Array<{
    eventId: string;
    storagePath: string;
  }>;
};

function resolveMode(options: CleanupRunOptions = {}): CleanupMode {
  const dryRun = options.dryRun ?? true;
  const shouldDelete = options.allowDelete === true && dryRun === false;
  const limit = Math.max(1, Math.min(options.limit ?? 250, 2000));
  const olderThanDays = Math.max(1, Math.min(options.olderThanDays ?? 90, 3650));
  const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

  return {
    dryRun,
    shouldDelete,
    limit,
    olderThanDays,
    cutoffIso: cutoff.toISOString(),
  };
}

async function getSupabaseClient(supabase?: SupabaseServerClient): Promise<SupabaseServerClient> {
  return supabase ?? createClient();
}

export async function cleanupReadNotifications(
  options: CleanupRunOptions = {},
  supabase?: SupabaseServerClient,
): Promise<CleanupSummary> {
  const mode = resolveMode(options);
  const client = await getSupabaseClient(supabase);
  const { data, error } = await client
    .from("notifications")
    .select("id")
    .eq("is_read", true)
    .lt("created_at", mode.cutoffIso)
    .order("created_at", { ascending: true })
    .limit(mode.limit);

  if (error) {
    throw new Error("Failed to load read notifications for cleanup.");
  }

  const candidateIds = (data ?? []).map((row) => row.id);
  let deleted = 0;

  if (mode.shouldDelete && candidateIds.length > 0) {
    const { error: deleteError, count } = await client
      .from("notifications")
      .delete({ count: "exact" })
      .in("id", candidateIds);

    if (deleteError) {
      throw new Error("Failed to delete stale read notifications.");
    }

    deleted = count ?? candidateIds.length;
  }

  return {
    ...mode,
    scanned: candidateIds.length,
    candidates: candidateIds.length,
    deleted,
    candidateIds,
  };
}

async function cleanupDraftTable(
  table: "listings" | "events",
  filterField: "status" | "is_published",
  filterValue: "draft" | false,
  mode: CleanupMode,
  client: SupabaseServerClient,
): Promise<CleanupSummary> {
  const { data, error } = await client
    .from(table)
    .select("id")
    .eq(filterField, filterValue)
    .lt("created_at", mode.cutoffIso)
    .order("created_at", { ascending: true })
    .limit(mode.limit);

  if (error) {
    throw new Error(`Failed to load stale ${table} drafts.`);
  }

  const candidateIds = (data ?? []).map((row) => row.id);
  let deleted = 0;

  if (mode.shouldDelete && candidateIds.length > 0) {
    const { error: deleteError, count } = await client
      .from(table)
      .delete({ count: "exact" })
      .in("id", candidateIds);

    if (deleteError) {
      throw new Error(`Failed to delete stale ${table} drafts.`);
    }

    deleted = count ?? candidateIds.length;
  }

  return {
    ...mode,
    scanned: candidateIds.length,
    candidates: candidateIds.length,
    deleted,
    candidateIds,
  };
}

export async function cleanupStaleDrafts(
  options: CleanupRunOptions = {},
  supabase?: SupabaseServerClient,
): Promise<DraftCleanupSummary> {
  const mode = resolveMode(options);
  const client = await getSupabaseClient(supabase);

  const [listings, events] = await Promise.all([
    cleanupDraftTable("listings", "status", "draft", mode, client),
    cleanupDraftTable("events", "is_published", false, mode, client),
  ]);

  return { listings, events };
}

async function cleanupEmptyConversationsTable(
  table: "conversations" | "friend_conversations",
  messageTable: "messages" | "friend_messages",
  mode: CleanupMode,
  client: SupabaseServerClient,
): Promise<CleanupSummary> {
  const { data: conversations, error: conversationsError } = await client
    .from(table)
    .select("id")
    .lt("updated_at", mode.cutoffIso)
    .order("updated_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(mode.limit);

  if (conversationsError) {
    throw new Error(`Failed to load ${table} for cleanup.`);
  }

  const conversationIds = (conversations ?? []).map((row) => row.id);
  if (conversationIds.length === 0) {
    return {
      ...mode,
      scanned: 0,
      candidates: 0,
      deleted: 0,
      candidateIds: [],
    };
  }

  const { data: messages, error: messagesError } = await client
    .from(messageTable)
    .select("conversation_id")
    .in("conversation_id", conversationIds);

  if (messagesError) {
    throw new Error(`Failed to load ${messageTable} for cleanup.`);
  }

  const populatedConversationIds = new Set((messages ?? []).map((row) => row.conversation_id));
  const candidateIds = conversationIds.filter((conversationId) => !populatedConversationIds.has(conversationId));
  let deleted = 0;

  if (mode.shouldDelete && candidateIds.length > 0) {
    const { error: deleteError, count } = await client
      .from(table)
      .delete({ count: "exact" })
      .in("id", candidateIds);

    if (deleteError) {
      throw new Error(`Failed to delete stale empty ${table}.`);
    }

    deleted = count ?? candidateIds.length;
  }

  return {
    ...mode,
    scanned: conversationIds.length,
    candidates: candidateIds.length,
    deleted,
    candidateIds,
  };
}

export async function cleanupStaleEmptyConversations(
  options: CleanupRunOptions = {},
  supabase?: SupabaseServerClient,
): Promise<ConversationCleanupSummary> {
  const mode = resolveMode(options);
  const client = await getSupabaseClient(supabase);

  const [marketConversations, friendConversations] = await Promise.all([
    cleanupEmptyConversationsTable("conversations", "messages", mode, client),
    cleanupEmptyConversationsTable("friend_conversations", "friend_messages", mode, client),
  ]);

  return { marketConversations, friendConversations };
}

export async function buildUploadReconciliationReport(
  options: Pick<CleanupRunOptions, "limit"> = {},
  supabase?: SupabaseServerClient,
): Promise<UploadReconciliationReport> {
  const limit = Math.max(1, Math.min(options.limit ?? 300, 2000));
  const client = await getSupabaseClient(supabase);

  const [listingImagesResult, profilesResult, communitiesResult, eventsResult] = await Promise.all([
    client
      .from("listing_images")
      .select("id, listing_id, storage_path")
      .order("created_at", { ascending: false })
      .limit(limit),
    client
      .from("profiles")
      .select("user_id, avatar_path")
      .not("avatar_path", "is", null)
      .limit(limit),
    client
      .from("communities")
      .select("id, avatar_path")
      .not("avatar_path", "is", null)
      .limit(limit),
    client
      .from("events")
      .select("id, cover_path")
      .not("cover_path", "is", null)
      .limit(limit),
  ]);

  if (listingImagesResult.error) {
    throw new Error("Failed to load listing image metadata for reconciliation.");
  }

  if (profilesResult.error || communitiesResult.error || eventsResult.error) {
    throw new Error("Failed to load media path metadata for reconciliation.");
  }

  const listingImages = listingImagesResult.data ?? [];
  const listingIds = Array.from(new Set(listingImages.map((row) => row.listing_id)));
  const { data: listings, error: listingsError } = listingIds.length
    ? await client
        .from("listings")
        .select("id")
        .in("id", listingIds)
    : { data: [] as Array<{ id: string }>, error: null };

  if (listingsError) {
    throw new Error("Failed to load listings during upload reconciliation.");
  }

  const listingIdSet = new Set((listings ?? []).map((row) => row.id));
  const orphanedListingImageRows = listingImages
    .filter((row) => !listingIdSet.has(row.listing_id) || !isSafeStoragePath(row.storage_path))
    .map((row) => ({
      listingImageId: row.id,
      listingId: row.listing_id,
      storagePath: row.storage_path,
    }));

  const suspiciousProfileAvatarPaths = (profilesResult.data ?? [])
    .filter((row) => row.avatar_path && !isSafeStoragePath(row.avatar_path))
    .map((row) => ({
      userId: row.user_id,
      storagePath: row.avatar_path as string,
    }));

  const suspiciousCommunityAvatarPaths = (communitiesResult.data ?? [])
    .filter((row) => row.avatar_path && !isSafeStoragePath(row.avatar_path))
    .map((row) => ({
      communityId: row.id,
      storagePath: row.avatar_path as string,
    }));

  const suspiciousEventCoverPaths = (eventsResult.data ?? [])
    .filter((row) => row.cover_path && !isSafeStoragePath(row.cover_path))
    .map((row) => ({
      eventId: row.id,
      storagePath: row.cover_path as string,
    }));

  return {
    limit,
    generatedAt: new Date().toISOString(),
    listingImageRowsScanned: listingImages.length,
    orphanedListingImageRows,
    suspiciousProfileAvatarPaths,
    suspiciousCommunityAvatarPaths,
    suspiciousEventCoverPaths,
  };
}
