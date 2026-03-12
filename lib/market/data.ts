import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import { isListingOwner } from "@/lib/market/ownership";
import { createPaginationWindow, splitPaginatedRows } from "@/lib/pagination";
import type { Database } from "@/types/database";

export type ListingRow = Database["public"]["Tables"]["listings"]["Row"];
export type ListingImageRow = Database["public"]["Tables"]["listing_images"]["Row"];
export type ListingStatus = ListingRow["status"];
export type ListingCardSource = Pick<
  ListingRow,
  "id" | "title" | "price_kzt" | "category" | "condition" | "pickup_location" | "status"
>;
export type ListingWithCoverRow = ListingCardSource & { cover_image_url: string | null };
export type ListingEditSource = Pick<
  ListingRow,
  "id" | "seller_id" | "title" | "description" | "price_kzt" | "category" | "condition" | "pickup_location" | "status"
>;

export type ListingSeller = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "user_id" | "full_name" | "school" | "major" | "year_label"
>;

export type ListingCardData = {
  id: string;
  title: string;
  price: string;
  category: string;
  condition: string;
  location: string;
  status?: string;
  imageUrl?: string;
};
export type PaginatedListingResult = {
  listings: ListingWithCoverRow[];
  hasMore: boolean;
};

const LISTING_IMAGES_BUCKET = "listing-images";
const LISTING_CARD_SELECT =
  "id, title, price_kzt, category, condition, pickup_location, status";
const LISTING_EDIT_SELECT =
  "id, seller_id, title, description, price_kzt, category, condition, pickup_location, status";

export function formatPriceKzt(priceKzt: number): string {
  return `${new Intl.NumberFormat("en-US").format(priceKzt)} KZT`;
}

export function formatStatusLabel(status: ListingStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function getPublicListingImageUrlFromClient(
  supabase: Awaited<ReturnType<typeof createClient>>,
  storagePath: string,
): string {
  const { data } = supabase.storage.from(LISTING_IMAGES_BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

async function getCoverImageMap(
  supabase: Awaited<ReturnType<typeof createClient>>,
  listingIds: string[],
): Promise<Map<string, string>> {
  const coverMap = new Map<string, string>();
  if (listingIds.length === 0) return coverMap;

  const { data, error } = await supabase
    .from("listing_images")
    .select("listing_id, storage_path")
    .in("listing_id", listingIds)
    .order("listing_id", { ascending: true })
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error("Failed to load listing images.");
  }

  for (const image of data) {
    if (!coverMap.has(image.listing_id)) {
      coverMap.set(image.listing_id, getPublicListingImageUrlFromClient(supabase, image.storage_path));
    }
  }

  return coverMap;
}

async function getListingImageUrls(
  supabase: Awaited<ReturnType<typeof createClient>>,
  listingId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("listing_images")
    .select("storage_path, sort_order")
    .eq("listing_id", listingId)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error("Failed to load listing images.");
  }

  return data.map((image) => getPublicListingImageUrlFromClient(supabase, image.storage_path));
}

function withCoverImage(
  listing: ListingCardSource,
  coverMap: Map<string, string>,
): ListingWithCoverRow {
  return {
    ...listing,
    cover_image_url: coverMap.get(listing.id) ?? null,
  };
}

export function toListingCardData(
  listing: ListingCardSource | ListingWithCoverRow,
): ListingCardData {
  return toListingCardDataWithOptions(listing);
}

export function toListingCardDataWithOptions(
  listing: ListingCardSource | ListingWithCoverRow,
  options: { showStatus?: boolean; imageUrl?: string | null } = {},
): ListingCardData {
  const coverImageUrl =
    options.imageUrl ?? ("cover_image_url" in listing ? listing.cover_image_url : null);

  return {
    id: listing.id,
    title: listing.title,
    price: formatPriceKzt(listing.price_kzt),
    category: listing.category,
    condition: listing.condition,
    location: listing.pickup_location,
    status: options.showStatus ? formatStatusLabel(listing.status) : undefined,
    imageUrl: coverImageUrl ?? undefined,
  };
}

export async function getActiveListings(limit = 24): Promise<ListingWithCoverRow[]> {
  const { listings } = await getActiveListingsPage(1, limit);
  return listings;
}

export async function getActiveListingsPage(
  page = 1,
  pageSize = 24,
): Promise<PaginatedListingResult> {
  const { from, to, pageSize: safePageSize } = createPaginationWindow({
    page,
    pageSize,
    defaultPageSize: 24,
    maxPageSize: 48,
  });
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("listings")
    .select(LISTING_CARD_SELECT)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, to);

  if (error) {
    throw new Error("Failed to load active listings.");
  }

  const paged = splitPaginatedRows(data, safePageSize);
  const coverMap = await getCoverImageMap(
    supabase,
    paged.rows.map((listing) => listing.id),
  );

  return {
    listings: paged.rows.map((listing) => withCoverImage(listing, coverMap)),
    hasMore: paged.hasMore,
  };
}

export async function getActiveListingsByCategory(
  category: string,
  limit = 100,
): Promise<ListingWithCoverRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("listings")
    .select(LISTING_CARD_SELECT)
    .eq("status", "active")
    .ilike("category", category)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error("Failed to load category listings.");
  }

  const coverMap = await getCoverImageMap(
    supabase,
    data.map((listing) => listing.id),
  );

  return data.map((listing) => withCoverImage(listing, coverMap));
}

export async function getMyListings(
  status: "active" | "reserved" | "sold" = "active",
): Promise<ListingWithCoverRow[]> {
  const { listings } = await getMyListingsPage(status, 1, 50);
  return listings;
}

export async function getMyListingsPage(
  status: "active" | "reserved" | "sold" = "active",
  page = 1,
  pageSize = 20,
): Promise<PaginatedListingResult> {
  const user = await requireUser();
  const { from, to, pageSize: safePageSize } = createPaginationWindow({
    page,
    pageSize,
    defaultPageSize: 20,
    maxPageSize: 40,
  });
  const supabase = await createClient();

  let query = supabase
    .from("listings")
    .select(LISTING_CARD_SELECT)
    .eq("seller_id", user.id)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, to);

  if (status === "active") {
    query = query.in("status", ["active", "draft"]);
  } else {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error("Failed to load your listings.");
  }

  const paged = splitPaginatedRows(data, safePageSize);
  const coverMap = await getCoverImageMap(
    supabase,
    paged.rows.map((listing) => listing.id),
  );

  return {
    listings: paged.rows.map((listing) => withCoverImage(listing, coverMap)),
    hasMore: paged.hasMore,
  };
}

export async function getSavedListings(): Promise<ListingWithCoverRow[]> {
  const { listings } = await getSavedListingsPage(1, 50);
  return listings;
}

export async function getSavedListingsPage(
  page = 1,
  pageSize = 20,
): Promise<PaginatedListingResult> {
  const user = await requireUser();
  const { from, to, pageSize: safePageSize } = createPaginationWindow({
    page,
    pageSize,
    defaultPageSize: 20,
    maxPageSize: 40,
  });
  const supabase = await createClient();

  const { data: savedRows, error: savedError } = await supabase
    .from("saved_listings")
    .select("listing_id, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .order("listing_id", { ascending: false })
    .range(from, to);

  if (savedError) {
    throw new Error("Failed to load saved listings.");
  }

  const pagedSavedRows = splitPaginatedRows(savedRows, safePageSize);

  if (pagedSavedRows.rows.length === 0) {
    return {
      listings: [],
      hasMore: false,
    };
  }

  const listingIds = pagedSavedRows.rows.map((row) => row.listing_id);
  const { data: listings, error: listingsError } = await supabase
    .from("listings")
    .select(LISTING_CARD_SELECT)
    .in("id", listingIds);

  if (listingsError) {
    throw new Error("Failed to load saved listing details.");
  }

  const coverMap = await getCoverImageMap(supabase, listingIds);
  const listingById = new Map(listings.map((listing) => [listing.id, listing]));

  return {
    listings: listingIds
    .map((id) => {
      const listing = listingById.get(id);
      if (!listing) return null;
      return withCoverImage(listing, coverMap);
    })
    .filter((listing): listing is ListingWithCoverRow => Boolean(listing)),
    hasMore: pagedSavedRows.hasMore,
  };
}

export async function getOwnedListingForEdit(listingId: string): Promise<ListingEditSource | null> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: listing, error } = await supabase
    .from("listings")
    .select(LISTING_EDIT_SELECT)
    .eq("id", listingId)
    .maybeSingle();

  if (error) {
    throw new Error("Failed to load listing.");
  }

  if (!listing || !isListingOwner(listing.seller_id, user.id)) {
    return null;
  }

  return listing;
}

export async function getListingDetail(listingId: string): Promise<{
  listing: ListingRow | null;
  seller: ListingSeller | null;
  isSaved: boolean;
  isOwner: boolean;
  imageUrls: string[];
}> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .select("*")
    .eq("id", listingId)
    .maybeSingle();

  if (listingError) {
    throw new Error("Failed to load listing.");
  }

  if (!listing) {
    return {
      listing: null,
      seller: null,
      isSaved: false,
      isOwner: false,
      imageUrls: [],
    };
  }

  const [{ data: seller, error: sellerError }, { data: savedRow, error: savedRowError }, imageUrls] = await Promise.all([
    supabase
      .from("profiles")
      .select("user_id, full_name, school, major, year_label")
      .eq("user_id", listing.seller_id)
      .maybeSingle(),
    supabase
      .from("saved_listings")
      .select("listing_id")
      .eq("user_id", user.id)
      .eq("listing_id", listing.id)
      .maybeSingle(),
    getListingImageUrls(supabase, listing.id),
  ]);

  if (sellerError) {
    throw new Error("Failed to load seller profile.");
  }

  if (savedRowError) {
    throw new Error("Failed to load saved listing status.");
  }

  return {
    listing,
    seller,
    isSaved: Boolean(savedRow),
    isOwner: isListingOwner(listing.seller_id, user.id),
    imageUrls,
  };
}
