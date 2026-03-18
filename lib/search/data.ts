import { requireUser } from "@/lib/auth/session";
import {
  type CommunityCardSource,
  toCommunityCardData,
  toPersonCardData,
  type CommunityCardData,
  type PersonCardData,
  type PersonCardSource,
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

  const uniqueListingIds = Array.from(new Set(listingIds));

  const { data: primaryRows, error: primaryError } = await supabase
    .from("listing_images")
    .select("listing_id, storage_path")
    .in("listing_id", uniqueListingIds)
    .eq("sort_order", 0);

  if (primaryError) {
    throw new Error("Failed to load listing search images.");
  }

  for (const image of primaryRows ?? []) {
    coverMap.set(image.listing_id, toListingImagePublicUrl(supabase, image.storage_path));
  }

  const missingListingIds = uniqueListingIds.filter((listingId) => !coverMap.has(listingId));
  if (missingListingIds.length === 0) {
    return coverMap;
  }

  const { data: fallbackRows, error: fallbackError } = await supabase
    .from("listing_images")
    .select("listing_id, storage_path")
    .in("listing_id", missingListingIds)
    .order("listing_id", { ascending: true })
    .order("sort_order", { ascending: true });

  if (fallbackError) {
    throw new Error("Failed to load listing search images.");
  }

  for (const image of fallbackRows ?? []) {
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

  const uniqueCommunityIds = Array.from(new Set(communityIds));
  const countResults = await Promise.all(
    uniqueCommunityIds.map((communityId) =>
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
      throw new Error("Failed to load community search counts.");
    }

    counts.set(uniqueCommunityIds[index], result.count ?? 0);
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
      .select("id, title, price_kzt, listing_type, pricing_model, category, condition, pickup_location, status")
      .eq("status", "active")
      .eq("is_hidden", false)
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
        "user_id, full_name, major, year_label, interests, looking_for, avatar_path",
      )
      .neq("user_id", user.id)
      .eq("onboarding_completed", true)
      .ilike("search_text", pattern)
      .order("created_at", { ascending: false })
      .order("user_id", { ascending: false })
      .limit(safeSectionLimit),
    supabase
      .from("communities")
      .select("id, name, description, tags, join_type, community_type, formal_kind, avatar_path")
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
  const profileRows = profilesResult.data as PersonCardSource[];
  const communityRows = communitiesResult.data as CommunitySearchRow[];

  const [listingCoverMap, joinedMemberCounts] = await Promise.all([
    getListingCoverMap(
      supabase,
      listingRows.map((listing) => listing.id),
    ),
    getJoinedCommunityMemberCounts(
      supabase,
      communityRows.map((community) => community.id),
    ),
  ]);

  const listings = listingRows.map((listing) =>
    toListingCardDataWithOptions(listing, {
      imageUrl: listingCoverMap.get(listing.id) ?? null,
    }),
  );

  const events = eventRows.map((event) => toEventCardData(event));

  const people = profileRows.map((profile) => toPersonCardData(profile));

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
