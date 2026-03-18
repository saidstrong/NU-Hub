import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import { isCommunityOwner } from "@/lib/connect/ownership";
import { isAdminUser } from "@/lib/moderation/data";
import { getDurationMs, logWarn } from "@/lib/observability/logger";
import { createPaginationWindow, splitPaginatedRows } from "@/lib/pagination";
import { toPublicStorageUrl } from "@/lib/validation/media";
import type { Database } from "@/types/database";

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type CommunityRow = Database["public"]["Tables"]["communities"]["Row"];
export type CommunityMemberRow = Database["public"]["Tables"]["community_members"]["Row"];
export type CommunityPostRow = Database["public"]["Tables"]["community_posts"]["Row"];
export type FriendshipRow = Database["public"]["Tables"]["friendships"]["Row"];
export type FriendConversationRow = Database["public"]["Tables"]["friend_conversations"]["Row"];
export type FriendMessageRow = Database["public"]["Tables"]["friend_messages"]["Row"];
type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
export type CommunityCardSource = Pick<
  CommunityRow,
  | "id"
  | "name"
  | "description"
  | "tags"
  | "join_type"
  | "community_type"
  | "formal_kind"
  | "avatar_path"
>;
export type CommunityEditSource = Pick<
  CommunityRow,
  "id" | "created_by" | "name" | "description" | "category" | "tags" | "join_type" | "avatar_path"
>;
export type PersonProfileDetail = Pick<
  ProfileRow,
  | "user_id"
  | "full_name"
  | "school"
  | "major"
  | "year_label"
  | "bio"
  | "interests"
  | "goals"
  | "looking_for"
  | "skills"
  | "projects"
  | "resume_url"
  | "links"
  | "avatar_path"
>;

export type CommunityMemberProfilePreview = Pick<
  ProfileRow,
  "user_id" | "full_name" | "major" | "year_label" | "avatar_path"
>;

export type PersonCardSource = Pick<
  ProfileRow,
  "user_id" | "full_name" | "major" | "year_label" | "interests" | "looking_for" | "avatar_path"
>;

export type CommunityCardData = {
  id: string;
  name: string;
  description: string;
  members: string;
  joinType: string;
  communityType: CommunityRow["community_type"];
  formalKind: CommunityRow["formal_kind"];
  tags: string[];
  status?: string;
  avatarUrl?: string;
};

export type CommunityCurationItem = {
  id: string;
  name: string;
  ownerId: string;
  ownerName: string;
  communityType: CommunityRow["community_type"];
  formalKind: CommunityRow["formal_kind"];
  isHidden: boolean;
  createdAt: string;
};

export type PersonCardData = {
  id: string;
  name: string;
  major: string;
  year: string;
  lookingFor: string;
  interests: string[];
  avatarUrl?: string;
};

export type CommunityDetail = {
  community: CommunityRow;
  memberCount: number;
  membership: CommunityMemberRow | null;
  ownerProfile: Pick<ProfileRow, "user_id" | "full_name" | "school" | "major" | "year_label"> | null;
  joinedMemberPreview: CommunityMemberProfilePreview[];
  posts: CommunityPostListItem[];
};

export type CommunityPostListItem = {
  id: string;
  communityId: string;
  authorId: string;
  authorName: string;
  authorAvatarPath: string | null;
  content: string;
  createdAt: string;
};

export type CommunityRequestItem = {
  community_id: string;
  community_name: string;
  user_id: string;
  requester_name: string;
  requester_meta: string;
  note: string;
};
export type FriendRelationship = Pick<
  FriendshipRow,
  "id" | "requester_id" | "addressee_id" | "status"
>;
export type FriendRequestItem = {
  friendshipId: string;
  requesterId: string;
  requesterName: string;
  requesterMajor: string | null;
  requesterYearLabel: string | null;
  requesterAvatarPath: string | null;
  createdAt: string;
};
export type FriendItem = {
  friendshipId: string;
  friendId: string;
  friendName: string;
  friendMajor: string | null;
  friendYearLabel: string | null;
  friendAvatarPath: string | null;
  updatedAt: string;
};
export type FriendInboxConversation = {
  conversationId: string;
  counterpartId: string;
  counterpartName: string;
  counterpartAvatarPath: string | null;
  counterpartMajor: string | null;
  counterpartYearLabel: string | null;
  lastMessagePreview: string;
  lastMessageSenderId: string | null;
  lastMessageAt: string;
  updatedAt: string;
};
export type FriendMessageThreadItem = {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatarPath: string | null;
  content: string;
  createdAt: string;
  isOwnMessage: boolean;
};
export type FriendConversationThread = {
  conversationId: string;
  counterpartId: string;
  counterpartName: string;
  counterpartAvatarPath: string | null;
  counterpartMajor: string | null;
  counterpartYearLabel: string | null;
  messages: FriendMessageThreadItem[];
};
export type CommunityListEntry = {
  community: CommunityCardSource;
  memberCount: number;
};
export type MyCommunityListEntry = CommunityListEntry & {
  status?: string;
};
export type PaginatedCommunityResult<TItem> = {
  items: TItem[];
  hasMore: boolean;
};

const COMMUNITY_MEMBER_PREVIEW_LIMIT = 10;
const COMMUNITY_POST_DETAIL_LIMIT = 25;
const LOADER_SLOW_THRESHOLD_MS = 150;
const LIGHTWEIGHT_MEMBER_COUNT_BATCH_SIZE = 6;
const INBOX_INITIAL_LAST_MESSAGE_SCAN_MULTIPLIER = 8;
const INBOX_MESSAGE_LOOKUP_BATCH_SIZE = 8;
const PEOPLE_DISCOVERY_DEFAULT_LIMIT = 16;
const PEOPLE_DISCOVERY_MAX_LIMIT = 500;

type FriendInboxLatestMessageLookupRow = Pick<
  FriendMessageRow,
  "conversation_id" | "sender_id" | "content" | "created_at"
>;

function formatJoinType(joinType: CommunityRow["join_type"]): string {
  return joinType === "open" ? "Open" : "Request";
}

function fallbackText(value: string | null | undefined, fallback: string): string {
  const safe = value?.trim();
  return safe && safe.length > 0 ? safe : fallback;
}

function toProfileAvatarUrl(avatarPath: string | null | undefined): string | undefined {
  const normalized = avatarPath?.trim();
  if (!normalized) {
    return undefined;
  }

  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }

  const withoutBucketPrefix = normalized.startsWith("avatars/")
    ? normalized.slice("avatars/".length)
    : normalized;

  const resolved = toPublicStorageUrl("avatars", withoutBucketPrefix);
  return resolved ?? undefined;
}

async function requireMatchingUserId(userId: string): Promise<string> {
  const user = await requireUser();

  if (user.id !== userId) {
    throw new Error("You can only view your own friend data.");
  }

  return user.id;
}

function dedupeStrings(values: string[]): string[] {
  return Array.from(new Set(values));
}

function toMessagePreview(value: string, maxLength = 120): string {
  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized) return "No messages yet.";
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength)}...`;
}

export function toPersonCardData(profile: PersonCardSource): PersonCardData {
  return {
    id: profile.user_id,
    name: fallbackText(profile.full_name, "NU student"),
    major: fallbackText(profile.major, "Undeclared"),
    year: fallbackText(profile.year_label, "Year not set"),
    lookingFor: profile.looking_for[0] ?? "Open to collaboration",
    interests: profile.interests,
    avatarUrl: toProfileAvatarUrl(profile.avatar_path),
  };
}

export function toCommunityCardData(
  community: CommunityCardSource,
  memberCount: number,
  options: { status?: string } = {},
): CommunityCardData {
  const avatarUrl = toPublicStorageUrl("avatars", community.avatar_path);

  return {
    id: community.id,
    name: community.name,
    description: community.description,
    members: `${memberCount}`,
    joinType: formatJoinType(community.join_type),
    communityType: community.community_type,
    formalKind: community.formal_kind,
    tags: community.tags,
    status: options.status,
    avatarUrl: avatarUrl ?? undefined,
  };
}

async function getJoinedMemberCounts(
  supabase: SupabaseServerClient,
  communityIds: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (communityIds.length === 0) return counts;

  // For small batches (home/connect surfaces), count per community to avoid
  // transferring every joined membership row over the network.
  if (communityIds.length <= LIGHTWEIGHT_MEMBER_COUNT_BATCH_SIZE) {
    const countResults = await Promise.all(
      communityIds.map((communityId) =>
        supabase
          .from("community_members")
          .select("user_id", { count: "exact", head: true })
          .eq("community_id", communityId)
          .eq("status", "joined"),
      ),
    );

    for (let index = 0; index < countResults.length; index += 1) {
      const result = countResults[index];
      if (result.error) {
        throw new Error("Failed to load community member counts.");
      }

      counts.set(communityIds[index], result.count ?? 0);
    }

    return counts;
  }

  const { data, error } = await supabase
    .from("community_members")
    .select("community_id")
    .in("community_id", communityIds)
    .eq("status", "joined");

  if (error) {
    throw new Error("Failed to load community member counts.");
  }

  for (const row of data) {
    counts.set(row.community_id, (counts.get(row.community_id) ?? 0) + 1);
  }

  return counts;
}

async function getLatestFriendMessagesByConversation(
  supabase: SupabaseServerClient,
  conversationIds: string[],
): Promise<Map<string, Pick<FriendMessageRow, "sender_id" | "content" | "created_at">>> {
  const latestByConversation = new Map<string, Pick<FriendMessageRow, "sender_id" | "content" | "created_at">>();
  if (conversationIds.length === 0) {
    return latestByConversation;
  }

  const initialScanLimit = Math.max(
    conversationIds.length,
    conversationIds.length * INBOX_INITIAL_LAST_MESSAGE_SCAN_MULTIPLIER,
  );
  const { data: initialRows, error: initialRowsError } = await supabase
    .from("friend_messages")
    .select("conversation_id, sender_id, content, created_at")
    .in("conversation_id", conversationIds)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(initialScanLimit);

  if (initialRowsError) {
    throw new Error("Failed to load friend inbox messages.");
  }

  for (const row of (initialRows ?? []) as FriendInboxLatestMessageLookupRow[]) {
    if (!latestByConversation.has(row.conversation_id)) {
      latestByConversation.set(row.conversation_id, {
        sender_id: row.sender_id,
        content: row.content,
        created_at: row.created_at,
      });
    }
  }

  const missingConversationIds = conversationIds.filter((conversationId) => !latestByConversation.has(conversationId));

  for (let index = 0; index < missingConversationIds.length; index += INBOX_MESSAGE_LOOKUP_BATCH_SIZE) {
    const chunk = missingConversationIds.slice(index, index + INBOX_MESSAGE_LOOKUP_BATCH_SIZE);
    const fallbackResults = await Promise.all(
      chunk.map((conversationId) =>
        supabase
          .from("friend_messages")
          .select("sender_id, content, created_at")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ),
    );

    for (let resultIndex = 0; resultIndex < fallbackResults.length; resultIndex += 1) {
      const fallbackResult = fallbackResults[resultIndex];
      if (fallbackResult.error) {
        throw new Error("Failed to load friend inbox messages.");
      }

      if (fallbackResult.data) {
        latestByConversation.set(chunk[resultIndex], fallbackResult.data);
      }
    }
  }

  return latestByConversation;
}

export async function getPeopleDiscovery(limit = PEOPLE_DISCOVERY_DEFAULT_LIMIT): Promise<PersonCardSource[]> {
  const user = await requireUser();
  const supabase = await createClient();
  const safeLimit = Math.max(1, Math.min(limit, PEOPLE_DISCOVERY_MAX_LIMIT));

  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, full_name, major, year_label, interests, looking_for, avatar_path")
    .neq("user_id", user.id)
    .eq("onboarding_completed", true)
    .order("created_at", { ascending: false })
    .order("user_id", { ascending: false })
    .limit(safeLimit);

  if (error) {
    throw new Error("Failed to load people discovery.");
  }

  return data;
}

export async function getPersonProfile(personId: string): Promise<PersonProfileDetail | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "user_id, full_name, school, major, year_label, bio, interests, goals, looking_for, skills, projects, resume_url, links, avatar_path",
    )
    .eq("user_id", personId)
    .maybeSingle();

  if (error) {
    throw new Error("Failed to load person profile.");
  }

  return data;
}

export async function getFriendshipWithPerson(personId: string): Promise<FriendRelationship | null> {
  const user = await requireUser();

  if (personId === user.id) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("friendships")
    .select("id, requester_id, addressee_id, status")
    .or(
      `and(requester_id.eq.${user.id},addressee_id.eq.${personId}),and(requester_id.eq.${personId},addressee_id.eq.${user.id})`,
    )
    .maybeSingle();

  if (error) {
    throw new Error("Failed to load friend relationship.");
  }

  return data;
}

export async function getFriendRequests(userId: string, limit = 20): Promise<FriendRequestItem[]> {
  const viewerId = await requireMatchingUserId(userId);
  const safeLimit = Math.max(1, Math.min(limit, 40));
  const supabase = await createClient();

  const { data: requests, error: requestsError } = await supabase
    .from("friendships")
    .select("id, requester_id, created_at")
    .eq("addressee_id", viewerId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (requestsError) {
    throw new Error("Failed to load friend requests.");
  }

  if (!requests || requests.length === 0) {
    return [];
  }

  const requesterIds = Array.from(new Set(requests.map((request) => request.requester_id)));
  const { data: requesterProfiles, error: requesterProfilesError } = await supabase
    .from("profiles")
    .select("user_id, full_name, major, year_label, avatar_path")
    .in("user_id", requesterIds);

  if (requesterProfilesError) {
    throw new Error("Failed to load requester profiles.");
  }

  const requesterMap = new Map(requesterProfiles.map((profile) => [profile.user_id, profile]));

  return requests.map((request) => {
    const profile = requesterMap.get(request.requester_id);

    return {
      friendshipId: request.id,
      requesterId: request.requester_id,
      requesterName: fallbackText(profile?.full_name, "NU student"),
      requesterMajor: profile?.major ?? null,
      requesterYearLabel: profile?.year_label ?? null,
      requesterAvatarPath: profile?.avatar_path ?? null,
      createdAt: request.created_at,
    };
  });
}

export async function getFriends(userId: string, limit = 200): Promise<FriendItem[]> {
  const viewerId = await requireMatchingUserId(userId);
  const safeLimit = Math.max(1, Math.min(limit, 400));
  const supabase = await createClient();

  const { data: friendships, error: friendshipsError } = await supabase
    .from("friendships")
    .select("id, requester_id, addressee_id, updated_at")
    .eq("status", "accepted")
    .or(`requester_id.eq.${viewerId},addressee_id.eq.${viewerId}`)
    .order("updated_at", { ascending: false })
    .limit(safeLimit);

  if (friendshipsError) {
    throw new Error("Failed to load friends.");
  }

  if (!friendships || friendships.length === 0) {
    return [];
  }

  const friendIds = Array.from(
    new Set(
      friendships.map((friendship) =>
        friendship.requester_id === viewerId ? friendship.addressee_id : friendship.requester_id,
      ),
    ),
  );

  const { data: friendProfiles, error: friendProfilesError } = await supabase
    .from("profiles")
    .select("user_id, full_name, major, year_label, avatar_path")
    .in("user_id", friendIds);

  if (friendProfilesError) {
    throw new Error("Failed to load friend profiles.");
  }

  const friendProfileMap = new Map(friendProfiles.map((profile) => [profile.user_id, profile]));
  const resolvedFriends = friendships.map((friendship) => {
    const friendId =
      friendship.requester_id === viewerId ? friendship.addressee_id : friendship.requester_id;
    const profile = friendProfileMap.get(friendId);

    return {
      friendshipId: friendship.id,
      friendId,
      friendName: fallbackText(profile?.full_name, "NU student"),
      friendMajor: profile?.major ?? null,
      friendYearLabel: profile?.year_label ?? null,
      friendAvatarPath: profile?.avatar_path ?? null,
      updatedAt: friendship.updated_at,
    };
  });

  return resolvedFriends.sort((a, b) => a.friendName.localeCompare(b.friendName, "en-US"));
}

export async function getFriendInbox(userId: string, limit = 25): Promise<FriendInboxConversation[]> {
  const startedAt = performance.now();
  let viewerId = userId;
  let outcome: "success" | "error" = "success";

  try {
    viewerId = await requireMatchingUserId(userId);
    const safeLimit = Math.max(1, Math.min(limit, 40));
    const supabase = await createClient();

    const { data: conversations, error: conversationsError } = await supabase
      .from("friend_conversations")
      .select("id, user_a_id, user_b_id, created_at, updated_at")
      .or(`user_a_id.eq.${viewerId},user_b_id.eq.${viewerId}`)
      .order("updated_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(safeLimit);

    if (conversationsError) {
      throw new Error("Failed to load friend inbox.");
    }

    if (!conversations || conversations.length === 0) {
      return [];
    }

    const typedConversations = conversations ?? [];
    const conversationIds = dedupeStrings(typedConversations.map((conversation) => conversation.id));
    const counterpartIds = dedupeStrings(
      typedConversations.map((conversation) =>
        conversation.user_a_id === viewerId ? conversation.user_b_id : conversation.user_a_id,
      ),
    );
    const [profilesResult, lastMessageMap] = await Promise.all([
      counterpartIds.length > 0
        ? supabase
            .from("profiles")
            .select("user_id, full_name, avatar_path, major, year_label")
            .in("user_id", counterpartIds)
        : Promise.resolve({
            data: [] as Pick<ProfileRow, "user_id" | "full_name" | "avatar_path" | "major" | "year_label">[],
            error: null,
          }),
      getLatestFriendMessagesByConversation(supabase, conversationIds),
    ]);

    if (profilesResult.error) {
      throw new Error("Failed to load friend inbox metadata.");
    }

    const profileMap = new Map((profilesResult.data ?? []).map((profile) => [profile.user_id, profile]));

    return typedConversations.map((conversation) => {
      const counterpartId =
        conversation.user_a_id === viewerId ? conversation.user_b_id : conversation.user_a_id;
      const counterpartProfile = profileMap.get(counterpartId);
      const latestMessage = lastMessageMap.get(conversation.id);

      return {
        conversationId: conversation.id,
        counterpartId,
        counterpartName: fallbackText(counterpartProfile?.full_name, "NU student"),
        counterpartAvatarPath: counterpartProfile?.avatar_path ?? null,
        counterpartMajor: counterpartProfile?.major ?? null,
        counterpartYearLabel: counterpartProfile?.year_label ?? null,
        lastMessagePreview: toMessagePreview(latestMessage?.content ?? ""),
        lastMessageSenderId: latestMessage?.sender_id ?? null,
        lastMessageAt: latestMessage?.created_at ?? conversation.created_at,
        updatedAt: conversation.updated_at,
      };
    });
  } catch (error) {
    outcome = "error";
    logWarn("connect", "friend_inbox_loader_failed", {
      action: "getFriendInbox",
      userId: viewerId,
      route: "/connect/messages",
      durationMs: getDurationMs(startedAt),
      outcome,
      error:
        error instanceof Error
          ? { name: error.name, message: error.message }
          : { name: "UnknownError" },
    });
    throw error;
  } finally {
    const durationMs = getDurationMs(startedAt);
    if (durationMs > LOADER_SLOW_THRESHOLD_MS) {
      logWarn("connect", "friend_inbox_loader_slow", {
        action: "getFriendInbox",
        userId: viewerId,
        route: "/connect/messages",
        durationMs,
        outcome,
      });
    }
  }
}

export async function getFriendConversationThread(
  conversationId: string,
): Promise<FriendConversationThread | null> {
  const startedAt = performance.now();
  let viewerId: string | null = null;
  let outcome: "success" | "error" = "success";

  try {
    const user = await requireUser();
    viewerId = user.id;
    const supabase = await createClient();

    const { data: conversation, error: conversationError } = await supabase
      .from("friend_conversations")
      .select("id, user_a_id, user_b_id")
      .eq("id", conversationId)
      .maybeSingle();

    if (conversationError) {
      throw new Error("Failed to load friend conversation.");
    }

    if (!conversation) {
      return null;
    }

    const isParticipant = conversation.user_a_id === user.id || conversation.user_b_id === user.id;
    if (!isParticipant) {
      return null;
    }

    const counterpartId = conversation.user_a_id === user.id ? conversation.user_b_id : conversation.user_a_id;

    const [profilesResult, messagesResult] = await Promise.all([
      supabase
        .from("profiles")
        .select("user_id, full_name, avatar_path, major, year_label")
        .in("user_id", dedupeStrings([conversation.user_a_id, conversation.user_b_id])),
      supabase
        .from("friend_messages")
        .select("id, sender_id, content, created_at")
        .eq("conversation_id", conversation.id)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .limit(250),
    ]);

    if (profilesResult.error || messagesResult.error) {
      throw new Error("Failed to load friend conversation thread.");
    }

    const profileMap = new Map((profilesResult.data ?? []).map((profile) => [profile.user_id, profile]));
    const counterpartProfile = profileMap.get(counterpartId);

    return {
      conversationId: conversation.id,
      counterpartId,
      counterpartName: fallbackText(counterpartProfile?.full_name, "NU student"),
      counterpartAvatarPath: counterpartProfile?.avatar_path ?? null,
      counterpartMajor: counterpartProfile?.major ?? null,
      counterpartYearLabel: counterpartProfile?.year_label ?? null,
      messages: (messagesResult.data ?? []).map((message) => {
        const senderProfile = profileMap.get(message.sender_id);
        const isOwnMessage = message.sender_id === user.id;

        return {
          id: message.id,
          senderId: message.sender_id,
          senderName: isOwnMessage ? "You" : fallbackText(senderProfile?.full_name, "NU student"),
          senderAvatarPath: senderProfile?.avatar_path ?? null,
          content: message.content,
          createdAt: message.created_at,
          isOwnMessage,
        };
      }),
    };
  } catch (error) {
    outcome = "error";
    logWarn("connect", "friend_thread_loader_failed", {
      action: "getFriendConversationThread",
      userId: viewerId,
      route: `/connect/messages/${conversationId}`,
      durationMs: getDurationMs(startedAt),
      outcome,
      error:
        error instanceof Error
          ? { name: error.name, message: error.message }
          : { name: "UnknownError" },
    });
    throw error;
  } finally {
    const durationMs = getDurationMs(startedAt);
    if (durationMs > LOADER_SLOW_THRESHOLD_MS) {
      logWarn("connect", "friend_thread_loader_slow", {
        action: "getFriendConversationThread",
        userId: viewerId,
        route: `/connect/messages/${conversationId}`,
        durationMs,
        outcome,
      });
    }
  }
}

export async function getCommunities(limit = 24): Promise<Array<{
  community: CommunityCardSource;
  memberCount: number;
}>> {
  const { items } = await getCommunitiesPage(1, limit);
  return items;
}

export async function getCommunitiesPage(
  page = 1,
  pageSize = 24,
): Promise<PaginatedCommunityResult<CommunityListEntry>> {
  const { from, to, pageSize: safePageSize } = createPaginationWindow({
    page,
    pageSize,
    defaultPageSize: 24,
    maxPageSize: 48,
  });
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("communities")
    .select("id, name, description, tags, join_type, community_type, formal_kind, avatar_path")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, to);

  if (error) {
    throw new Error("Failed to load communities.");
  }

  const paged = splitPaginatedRows(data, safePageSize);
  const communityIds = paged.rows.map((community) => community.id);
  const memberCounts = await getJoinedMemberCounts(supabase, communityIds);

  return {
    items: paged.rows.map((community) => ({
      community,
      memberCount: memberCounts.get(community.id) ?? 0,
    })),
    hasMore: paged.hasMore,
  };
}

export async function getCommunityDetail(communityId: string): Promise<CommunityDetail | null> {
  const startedAt = performance.now();
  let viewerId: string | null = null;
  let outcome: "success" | "error" = "success";

  try {
    const user = await requireUser();
    viewerId = user.id;
    const supabase = await createClient();

    const { data: community, error: communityError } = await supabase
      .from("communities")
      .select("*")
      .eq("id", communityId)
      .maybeSingle();

    if (communityError) {
      throw new Error("Failed to load community.");
    }

    if (!community) return null;

    const [memberCountMap, membershipResult, ownerResult, joinedMembersResult, postsResult] = await Promise.all([
      getJoinedMemberCounts(supabase, [community.id]),
      supabase
        .from("community_members")
        .select("*")
        .eq("community_id", community.id)
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("profiles")
        .select("user_id, full_name, school, major, year_label")
        .eq("user_id", community.created_by)
        .maybeSingle(),
      supabase
        .from("community_members")
        .select(
          "user_id, member_profile:profiles!community_members_user_id_fkey(full_name, major, year_label, avatar_path)",
        )
        .eq("community_id", community.id)
        .eq("status", "joined")
        .order("created_at", { ascending: true })
        .limit(COMMUNITY_MEMBER_PREVIEW_LIMIT),
      supabase
        .from("community_posts")
        .select(
          "id, community_id, author_id, content, created_at, author_profile:profiles!community_posts_author_id_fkey(user_id, full_name, avatar_path)",
        )
        .eq("community_id", community.id)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(COMMUNITY_POST_DETAIL_LIMIT),
    ]);

    if (membershipResult.error) {
      throw new Error("Failed to load your community membership.");
    }

    if (ownerResult.error) {
      throw new Error("Failed to load community owner profile.");
    }

    if (joinedMembersResult.error) {
      throw new Error("Failed to load community members.");
    }

    if (postsResult.error) {
      throw new Error("Failed to load community posts.");
    }

    const joinedMemberPreview = (joinedMembersResult.data ?? [])
      .map((row) => {
        const profile = Array.isArray(row.member_profile)
          ? row.member_profile[0]
          : row.member_profile;
        return {
          user_id: row.user_id,
          full_name: profile?.full_name ?? "",
          major: profile?.major ?? null,
          year_label: profile?.year_label ?? null,
          avatar_path: profile?.avatar_path ?? null,
        };
      })
      .filter((member): member is CommunityMemberProfilePreview => Boolean(member.user_id));

    const posts = (postsResult.data ?? []).map((row) => {
      const authorProfile = Array.isArray(row.author_profile)
        ? row.author_profile[0]
        : row.author_profile;

      return {
        id: row.id,
        communityId: row.community_id,
        authorId: row.author_id,
        authorName: fallbackText(authorProfile?.full_name, "NU student"),
        authorAvatarPath: authorProfile?.avatar_path ?? null,
        content: row.content,
        createdAt: row.created_at,
      };
    });

    return {
      community,
      memberCount: memberCountMap.get(community.id) ?? 0,
      membership: membershipResult.data,
      ownerProfile: ownerResult.data,
      joinedMemberPreview,
      posts,
    };
  } catch (error) {
    outcome = "error";
    logWarn("connect", "community_detail_loader_failed", {
      action: "getCommunityDetail",
      userId: viewerId,
      route: `/connect/communities/${communityId}`,
      durationMs: getDurationMs(startedAt),
      outcome,
      error:
        error instanceof Error
          ? { name: error.name, message: error.message }
          : { name: "UnknownError" },
    });
    throw error;
  } finally {
    const durationMs = getDurationMs(startedAt);
    if (durationMs > LOADER_SLOW_THRESHOLD_MS) {
      logWarn("connect", "community_detail_loader_slow", {
        action: "getCommunityDetail",
        userId: viewerId,
        route: `/connect/communities/${communityId}`,
        durationMs,
        outcome,
      });
    }
  }
}

export async function getMyCommunities(
  view: "joined" | "created" | "pending" = "joined",
): Promise<Array<{ community: CommunityCardSource; memberCount: number; status?: string }>> {
  const { items } = await getMyCommunitiesPage(view, 1, 50);
  return items;
}

export async function getMyCommunitiesPage(
  view: "joined" | "created" | "pending" = "joined",
  page = 1,
  pageSize = 20,
): Promise<PaginatedCommunityResult<MyCommunityListEntry>> {
  const user = await requireUser();
  const { from, to, pageSize: safePageSize } = createPaginationWindow({
    page,
    pageSize,
    defaultPageSize: 20,
    maxPageSize: 40,
  });
  const supabase = await createClient();

  if (view === "created") {
    const { data, error } = await supabase
      .from("communities")
      .select("id, name, description, tags, join_type, community_type, formal_kind, avatar_path")
      .eq("created_by", user.id)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(from, to);

    if (error) {
      throw new Error("Failed to load your created communities.");
    }

    const paged = splitPaginatedRows(data, safePageSize);
    const memberCounts = await getJoinedMemberCounts(
      supabase,
      paged.rows.map((community) => community.id),
    );

    return {
      items: paged.rows.map((community) => ({
        community,
        memberCount: memberCounts.get(community.id) ?? 0,
        status: "Owner",
      })),
      hasMore: paged.hasMore,
    };
  }

  const membershipStatus = view === "pending" ? "pending" : "joined";
  const membershipsQuery = supabase
    .from("community_members")
    .select("community_id, status")
    .eq("user_id", user.id)
    .eq("status", membershipStatus)
    .order("created_at", { ascending: false })
    .order("community_id", { ascending: false })
    .range(from, to);

  const { data: membershipsPage, error: membershipsPageError } = await membershipsQuery;

  if (membershipsPageError) {
    throw new Error("Failed to load your community memberships.");
  }

  const pagedMemberships = splitPaginatedRows(membershipsPage, safePageSize);

  if (pagedMemberships.rows.length === 0) {
    return {
      items: [],
      hasMore: false,
    };
  }

  const communityIds = pagedMemberships.rows.map((membership) => membership.community_id);
  const { data: communities, error: communitiesError } = await supabase
    .from("communities")
    .select("id, name, description, tags, join_type, community_type, formal_kind, avatar_path")
    .in("id", communityIds);

  if (communitiesError) {
    throw new Error("Failed to load community details.");
  }

  const communityMap = new Map(communities.map((community) => [community.id, community]));
  const memberCounts = await getJoinedMemberCounts(supabase, communityIds);

  const resolvedCommunities: MyCommunityListEntry[] = [];

  for (const membership of pagedMemberships.rows) {
    const community = communityMap.get(membership.community_id);
    if (!community) continue;

    resolvedCommunities.push({
      community,
      memberCount: memberCounts.get(community.id) ?? 0,
      status: membership.status === "pending" ? "Pending" : "Joined",
    });
  }

  return {
    items: resolvedCommunities,
    hasMore: pagedMemberships.hasMore,
  };
}

export async function getOwnedCommunityForEdit(
  communityId: string,
): Promise<CommunityEditSource | null> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: community, error } = await supabase
    .from("communities")
    .select("id, created_by, name, description, category, tags, join_type, avatar_path")
    .eq("id", communityId)
    .maybeSingle();

  if (error) {
    throw new Error("Failed to load community.");
  }

  if (!community || !isCommunityOwner(community.created_by, user.id)) {
    return null;
  }

  return community;
}

export async function getOwnerPendingCommunityRequests(limit = 80): Promise<CommunityRequestItem[]> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: ownedCommunities, error: communitiesError } = await supabase
    .from("communities")
    .select("id, name")
    .eq("created_by", user.id);

  if (communitiesError) {
    throw new Error("Failed to load owner communities.");
  }

  if (ownedCommunities.length === 0) {
    return [];
  }

  const ownedCommunityMap = new Map(
    ownedCommunities.map((community) => [community.id, community.name]),
  );
  const ownedCommunityIds = ownedCommunities.map((community) => community.id);

  const { data: requestRows, error: requestError } = await supabase
    .from("community_members")
    .select("community_id, user_id")
    .in("community_id", ownedCommunityIds)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (requestError) {
    throw new Error("Failed to load join requests.");
  }

  if (requestRows.length === 0) {
    return [];
  }

  const requesterIds = Array.from(new Set(requestRows.map((row) => row.user_id)));
  const { data: requesterProfiles, error: requesterError } = await supabase
    .from("profiles")
    .select("user_id, full_name, major, year_label, bio, looking_for")
    .in("user_id", requesterIds);

  if (requesterError) {
    throw new Error("Failed to load requester profiles.");
  }

  const requesterMap = new Map(requesterProfiles.map((profile) => [profile.user_id, profile]));

  return requestRows.map((row) => {
    const requester = requesterMap.get(row.user_id);
    const requesterMeta = [requester?.major, requester?.year_label]
      .map((value) => value?.trim())
      .filter(Boolean)
      .join(" - ");

    return {
      community_id: row.community_id,
      community_name: ownedCommunityMap.get(row.community_id) ?? "Community",
      user_id: row.user_id,
      requester_name: fallbackText(requester?.full_name, "NU student"),
      requester_meta: requesterMeta || "Campus member",
      note:
        requester?.looking_for?.[0] ??
        requester?.bio ??
        "Interested in joining this community.",
    };
  });
}

export async function getCommunitiesForCuration(limit = 80): Promise<CommunityCurationItem[]> {
  const user = await requireUser();
  if (!isAdminUser(user)) {
    throw new Error("Only admins can load communities for curation.");
  }

  const supabase = await createClient();
  const safeLimit = Math.max(1, Math.min(limit, 120));
  const { data: communities, error: communitiesError } = await supabase
    .from("communities")
    .select("id, name, created_by, community_type, formal_kind, is_hidden, created_at")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(safeLimit);

  if (communitiesError) {
    throw new Error("Failed to load communities for curation.");
  }

  if (!communities || communities.length === 0) {
    return [];
  }

  const ownerIds = dedupeStrings(communities.map((community) => community.created_by));
  const { data: ownerProfiles, error: ownerProfilesError } = await supabase
    .from("profiles")
    .select("user_id, full_name")
    .in("user_id", ownerIds);

  if (ownerProfilesError) {
    throw new Error("Failed to load community owner profiles.");
  }

  const ownerNameMap = new Map(
    (ownerProfiles ?? []).map((profile) => [profile.user_id, fallbackText(profile.full_name, "NU student")]),
  );

  return communities.map((community) => ({
    id: community.id,
    name: community.name,
    ownerId: community.created_by,
    ownerName: ownerNameMap.get(community.created_by) ?? "NU student",
    communityType: community.community_type,
    formalKind: community.formal_kind,
    isHidden: community.is_hidden,
    createdAt: community.created_at,
  }));
}
