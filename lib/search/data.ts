import { requireUser } from "@/lib/auth/session";
import {
  type CommunityCardSource,
  toCommunityCardData,
  toPersonCardData,
  type CommunityCardData,
  type PersonCardData,
  type PeopleDiscoveryItem,
} from "@/lib/connect/data";
import {
  toEventCardData,
  type EventCardData,
  type EventCardSource,
} from "@/lib/events/data";
import {
  toListingCardDataWithOptions,
  type ListingCardData,
  type ListingCardSource,
} from "@/lib/market/data";
import { createClient } from "@/lib/supabase/server";
import { toIlikePattern } from "@/lib/validation/search";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const LISTING_IMAGES_BUCKET = "listing-images";
const SEARCH_SECTION_MAX_LIMIT = 10;
type CommunitySearchRow = CommunityCardSource;

export type GlobalSearchResults = {
  listings: ListingCardData[];
  events: EventCardData[];
  people: PersonCardData[];
  communities: CommunityCardData[];
};

function toListingImagePublicUrl(
  supabase: SupabaseServerClient,
  storagePath: string,
): string {
  const { data } = supabase.storage.from(LISTING_IMAGES_BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

async function getListingCoverMap(
  supabase: SupabaseServerClient,
  listingIds: string[],
): Promise<Map<string, string>> {
  const coverMap = new Map<string, string>();
  if (listingIds.length === 0) return coverMap;

  const { data, error } = await supabase
    .from("listing_images")
    .select("listing_id, storage_path, sort_order")
    .in("listing_id", listingIds)
    .order("listing_id", { ascending: true })
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error("Failed to load listing search images.");
  }

  for (const image of data) {
    if (!coverMap.has(image.listing_id)) {
      coverMap.set(image.listing_id, toListingImagePublicUrl(supabase, image.storage_path));
    }
  }

  return coverMap;
}

async function getJoinedCommunityMemberCounts(
  supabase: SupabaseServerClient,
  communityIds: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (communityIds.length === 0) return counts;

  const countEntries = await Promise.all(
    communityIds.map(async (communityId) => {
      const { count, error } = await supabase
        .from("community_members")
        .select("*", { count: "exact", head: true })
        .eq("community_id", communityId)
        .eq("status", "joined");

      if (error) {
        throw new Error("Failed to load community search counts.");
      }

      return [communityId, count ?? 0] as const;
    }),
  );

  for (const [communityId, count] of countEntries) {
    counts.set(communityId, count);
  }

  return counts;
}

export async function searchGlobalEntities(
  query: string,
  limitPerSection: number,
): Promise<GlobalSearchResults> {
  const safeSectionLimit = Math.max(1, Math.min(limitPerSection, SEARCH_SECTION_MAX_LIMIT));
  const user = await requireUser();
  const supabase = await createClient();
  const normalizedQuery = query.toLowerCase();
  const pattern = toIlikePattern(normalizedQuery);

  const [
    listingsResult,
    eventsResult,
    profilesResult,
    communitiesResult,
  ] = await Promise.all([
    supabase
      .from("listings")
      .select("id, title, price_kzt, category, condition, pickup_location, status")
      .eq("status", "active")
      .or(
        `title.ilike.${pattern},description.ilike.${pattern},category.ilike.${pattern},pickup_location.ilike.${pattern}`,
      )
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(safeSectionLimit),
    supabase
      .from("events")
      .select("id, title, starts_at, ends_at, location, category")
      .eq("is_published", true)
      .or(`title.ilike.${pattern},description.ilike.${pattern},category.ilike.${pattern},location.ilike.${pattern}`)
      .order("starts_at", { ascending: true })
      .order("id", { ascending: true })
      .limit(safeSectionLimit),
    supabase
      .from("profiles")
      .select(
        "user_id, full_name, school, major, year_label, bio, interests, goals, looking_for, skills",
      )
      .neq("user_id", user.id)
      .eq("onboarding_completed", true)
      .ilike("search_text", pattern)
      .order("created_at", { ascending: false })
      .order("user_id", { ascending: false })
      .limit(safeSectionLimit),
    supabase
      .from("communities")
      .select("id, name, description, tags, join_type, avatar_path")
      .ilike("search_text", pattern)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(safeSectionLimit),
  ]);

  if (listingsResult.error) {
    throw new Error("Failed to search listings.");
  }

  if (eventsResult.error) {
    throw new Error("Failed to search events.");
  }

  if (profilesResult.error) {
    throw new Error("Failed to search people.");
  }

  if (communitiesResult.error) {
    throw new Error("Failed to search communities.");
  }

  const listingRows = listingsResult.data as ListingCardSource[];
  const eventRows = eventsResult.data as EventCardSource[];
  const profileRows = profilesResult.data as PeopleDiscoveryItem[];
  const communityRows = communitiesResult.data as CommunitySearchRow[];

  const listingCoverMap = await getListingCoverMap(
    supabase,
    listingRows.map((listing) => listing.id),
  );

  const listings = listingRows.map((listing) =>
    toListingCardDataWithOptions(listing, {
      imageUrl: listingCoverMap.get(listing.id) ?? null,
    }),
  );

  const events = eventRows.map((event) => toEventCardData(event));

  const people = profileRows.map((profile) => toPersonCardData(profile));

  const joinedMemberCounts = await getJoinedCommunityMemberCounts(
    supabase,
    communityRows.map((community) => community.id),
  );

  const communities = communityRows.map((community) =>
    toCommunityCardData(community, joinedMemberCounts.get(community.id) ?? 0),
  );

  return {
    listings,
    events,
    people,
    communities,
  };
}
