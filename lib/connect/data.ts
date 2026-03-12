import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import { isCommunityOwner } from "@/lib/connect/ownership";
import { createPaginationWindow, splitPaginatedRows } from "@/lib/pagination";
import { toPublicStorageUrl } from "@/lib/validation/media";
import type { Database } from "@/types/database";

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type CommunityRow = Database["public"]["Tables"]["communities"]["Row"];
export type CommunityMemberRow = Database["public"]["Tables"]["community_members"]["Row"];
type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
export type CommunityCardSource = Pick<
  CommunityRow,
  "id" | "name" | "description" | "tags" | "join_type" | "avatar_path"
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
>;

export type PeopleDiscoveryItem = {
  user_id: string;
  full_name: string;
  school: string | null;
  major: string | null;
  year_label: string | null;
  bio: string | null;
  interests: string[];
  goals: string[];
  looking_for: string[];
  skills: string[];
};

export type CommunityCardData = {
  id: string;
  name: string;
  description: string;
  members: string;
  joinType: string;
  tags: string[];
  status?: string;
  avatarUrl?: string;
};

export type PersonCardData = {
  id: string;
  name: string;
  major: string;
  year: string;
  lookingFor: string;
  interests: string[];
};

export type CommunityDetail = {
  community: CommunityRow;
  memberCount: number;
  membership: CommunityMemberRow | null;
  ownerProfile: Pick<ProfileRow, "user_id" | "full_name" | "school" | "major" | "year_label"> | null;
};

export type CommunityRequestItem = {
  community_id: string;
  community_name: string;
  user_id: string;
  requester_name: string;
  requester_meta: string;
  note: string;
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

function formatJoinType(joinType: CommunityRow["join_type"]): string {
  return joinType === "open" ? "Open" : "Request";
}

function fallbackText(value: string | null | undefined, fallback: string): string {
  const safe = value?.trim();
  return safe && safe.length > 0 ? safe : fallback;
}

export function toPersonCardData(profile: PeopleDiscoveryItem): PersonCardData {
  return {
    id: profile.user_id,
    name: fallbackText(profile.full_name, "NU student"),
    major: fallbackText(profile.major, "Undeclared"),
    year: fallbackText(profile.year_label, "Year not set"),
    lookingFor: profile.looking_for[0] ?? "Open to collaboration",
    interests: profile.interests,
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

export async function getPeopleDiscovery(limit = 16): Promise<PeopleDiscoveryItem[]> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "user_id, full_name, school, major, year_label, bio, interests, goals, looking_for, skills",
    )
    .neq("user_id", user.id)
    .eq("onboarding_completed", true)
    .order("created_at", { ascending: false })
    .limit(limit);

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
      "user_id, full_name, school, major, year_label, bio, interests, goals, looking_for, skills, projects, resume_url, links",
    )
    .eq("user_id", personId)
    .eq("onboarding_completed", true)
    .maybeSingle();

  if (error) {
    throw new Error("Failed to load person profile.");
  }

  return data;
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
    .select("id, name, description, tags, join_type, avatar_path")
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
  const user = await requireUser();
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

  const [memberCountMap, membershipResult, ownerResult] = await Promise.all([
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
  ]);

  if (membershipResult.error) {
    throw new Error("Failed to load your community membership.");
  }

  if (ownerResult.error) {
    throw new Error("Failed to load community owner profile.");
  }

  return {
    community,
    memberCount: memberCountMap.get(community.id) ?? 0,
    membership: membershipResult.data,
    ownerProfile: ownerResult.data,
  };
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
      .select("id, name, description, tags, join_type, avatar_path")
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
    .select("id, name, description, tags, join_type, avatar_path")
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
