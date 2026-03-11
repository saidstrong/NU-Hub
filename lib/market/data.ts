import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import type { Database } from "@/types/database";

export type ListingRow = Database["public"]["Tables"]["listings"]["Row"];
export type ListingImageRow = Database["public"]["Tables"]["listing_images"]["Row"];
export type ListingStatus = ListingRow["status"];
export type ListingWithCoverRow = ListingRow & { cover_image_url: string | null };

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

const LISTING_IMAGES_BUCKET = "listing-images";

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
    .select("listing_id, storage_path, sort_order")
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
  listing: ListingRow,
  coverMap: Map<string, string>,
): ListingWithCoverRow {
  return {
    ...listing,
    cover_image_url: coverMap.get(listing.id) ?? null,
  };
}

export function toListingCardData(listing: ListingRow | ListingWithCoverRow): ListingCardData {
  return toListingCardDataWithOptions(listing);
}

export function toListingCardDataWithOptions(
  listing: ListingRow | ListingWithCoverRow,
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
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error("Failed to load active listings.");
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
  const user = await requireUser();
  const supabase = await createClient();

  let query = supabase
    .from("listings")
    .select("*")
    .eq("seller_id", user.id)
    .order("created_at", { ascending: false });

  if (status === "active") {
    query = query.in("status", ["active", "draft"]);
  } else {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error("Failed to load your listings.");
  }

  const coverMap = await getCoverImageMap(
    supabase,
    data.map((listing) => listing.id),
  );

  return data.map((listing) => withCoverImage(listing, coverMap));
}

export async function getSavedListings(): Promise<ListingWithCoverRow[]> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: savedRows, error: savedError } = await supabase
    .from("saved_listings")
    .select("listing_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (savedError) {
    throw new Error("Failed to load saved listings.");
  }

  if (savedRows.length === 0) {
    return [];
  }

  const listingIds = savedRows.map((row) => row.listing_id);
  const { data: listings, error: listingsError } = await supabase
    .from("listings")
    .select("*")
    .in("id", listingIds);

  if (listingsError) {
    throw new Error("Failed to load saved listing details.");
  }

  const coverMap = await getCoverImageMap(supabase, listingIds);
  const listingById = new Map(listings.map((listing) => [listing.id, listing]));

  return listingIds
    .map((id) => {
      const listing = listingById.get(id);
      if (!listing) return null;
      return withCoverImage(listing, coverMap);
    })
    .filter((listing): listing is ListingWithCoverRow => Boolean(listing));
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
    isOwner: listing.seller_id === user.id,
    imageUrls,
  };
}
