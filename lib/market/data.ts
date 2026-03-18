import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import { isListingOwner } from "@/lib/market/ownership";
import { getDurationMs, logWarn } from "@/lib/observability/logger";
import { createPaginationWindow, splitPaginatedRows } from "@/lib/pagination";
import type { Database } from "@/types/database";

export type ListingRow = Database["public"]["Tables"]["listings"]["Row"];
export type ListingImageRow = Database["public"]["Tables"]["listing_images"]["Row"];
export type ConversationRow = Database["public"]["Tables"]["conversations"]["Row"];
export type MessageRow = Database["public"]["Tables"]["messages"]["Row"];
export type ListingStatus = ListingRow["status"];
export type ListingType = ListingRow["listing_type"];
export type PricingModel = ListingRow["pricing_model"];
export type ListingCardSource = Pick<
  ListingRow,
  | "id"
  | "title"
  | "price_kzt"
  | "listing_type"
  | "pricing_model"
  | "category"
  | "condition"
  | "pickup_location"
  | "status"
> & {
  is_featured?: boolean;
};
export type ListingWithCoverRow = ListingCardSource & { cover_image_url: string | null };
export type ListingEditSource = Pick<
  ListingRow,
  | "id"
  | "seller_id"
  | "title"
  | "description"
  | "price_kzt"
  | "listing_type"
  | "pricing_model"
  | "category"
  | "condition"
  | "pickup_location"
  | "status"
>;

export type ListingSeller = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "user_id" | "full_name" | "school" | "major" | "year_label" | "avatar_path"
>;
type ProfileIdentity = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "user_id" | "full_name" | "avatar_path"
>;
type ListingContextRow = Pick<
  ListingRow,
  "id" | "title" | "price_kzt" | "status" | "listing_type" | "pricing_model"
>;

export type ListingCardData = {
  id: string;
  title: string;
  price: string;
  listingTypeLabel: string;
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
export type FeaturedListingReviewItem = {
  id: string;
  title: string;
  priceKzt: number;
  listingType: ListingType;
  pricingModel: PricingModel;
  status: ListingStatus;
  isFeatured: boolean;
  createdAt: string;
  sellerName: string;
};
export type MarketplaceConversationListItem = {
  id: string;
  listingId: string;
  listingTitle: string;
  listingPriceKzt: number | null;
  listingType: ListingType | null;
  pricingModel: PricingModel | null;
  listingStatus: ListingStatus | null;
  listingCoverImageUrl: string | null;
  counterpartId: string;
  counterpartName: string;
  counterpartAvatarPath: string | null;
  lastMessagePreview: string;
  lastMessageAt: string;
  lastMessageCreatedAt: string | null;
  lastMessageSenderId: string;
  updatedAt: string;
};
export type PaginatedMarketplaceConversationResult = {
  conversations: MarketplaceConversationListItem[];
  hasMore: boolean;
};
export type MarketplaceThreadMessageItem = {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatarPath: string | null;
  content: string;
  createdAt: string;
  isOwnMessage: boolean;
};
export type MarketplaceConversationThread = {
  conversationId: string;
  listingId: string;
  listingTitle: string;
  listingPriceKzt: number | null;
  listingType: ListingType | null;
  pricingModel: PricingModel | null;
  listingStatus: ListingStatus | null;
  listingCoverImageUrl: string | null;
  listingHref: string | null;
  currentUserId: string;
  counterpartId: string;
  counterpartName: string;
  counterpartAvatarPath: string | null;
  messages: MarketplaceThreadMessageItem[];
};

const LISTING_IMAGES_BUCKET = "listing-images";
const LOADER_SLOW_THRESHOLD_MS = 150;
const INBOX_INITIAL_LAST_MESSAGE_SCAN_MULTIPLIER = 8;
const INBOX_MESSAGE_LOOKUP_BATCH_SIZE = 8;
const LISTING_CARD_SELECT =
  "id, title, price_kzt, listing_type, pricing_model, category, condition, pickup_location, status, is_featured";
const LISTING_EDIT_SELECT =
  "id, seller_id, title, description, price_kzt, listing_type, pricing_model, category, condition, pickup_location, status";

type MarketplaceLatestMessageLookupRow = Pick<
  MessageRow,
  "conversation_id" | "sender_id" | "content" | "created_at"
>;

export function formatPriceKzt(priceKzt: number): string {
  return `${new Intl.NumberFormat("en-US").format(priceKzt)} KZT`;
}

export function formatListingTypeLabel(listingType: ListingType): string {
  if (listingType === "rental") return "Rental";
  if (listingType === "service") return "Service";
  return "Sale";
}

export function formatPricingModelLabel(pricingModel: PricingModel): string {
  if (pricingModel === "per_day") return "Per day";
  if (pricingModel === "per_week") return "Per week";
  if (pricingModel === "per_month") return "Per month";
  if (pricingModel === "per_hour") return "Per hour";
  if (pricingModel === "starting_from") return "Starting from";
  return "Fixed";
}

export function formatCompactListingPrice(priceKzt: number, pricingModel: PricingModel): string {
  const base = formatPriceKzt(priceKzt);
  if (pricingModel === "per_day") return `${base}/day`;
  if (pricingModel === "per_week") return `${base}/week`;
  if (pricingModel === "per_month") return `${base}/month`;
  if (pricingModel === "per_hour") return `${base}/hour`;
  if (pricingModel === "starting_from") return `From ${base}`;
  return base;
}

export function formatStatusLabel(status: ListingStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function dedupeStrings(values: string[]): string[] {
  return Array.from(new Set(values));
}

function normalizeName(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : "NU student";
}

function isAdminUser(user: Awaited<ReturnType<typeof requireUser>>): boolean {
  const metadata = user.app_metadata;
  if (!metadata || typeof metadata !== "object") {
    return false;
  }

  return (metadata as Record<string, unknown>).role === "admin";
}

function toMessagePreview(value: string, maxLength = 120): string {
  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized) return "No messages yet.";
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength)}...`;
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

async function getLatestMarketplaceMessagesByConversation(
  supabase: Awaited<ReturnType<typeof createClient>>,
  conversationIds: string[],
): Promise<Map<string, Pick<MessageRow, "sender_id" | "content" | "created_at">>> {
  const latestByConversation = new Map<string, Pick<MessageRow, "sender_id" | "content" | "created_at">>();
  if (conversationIds.length === 0) {
    return latestByConversation;
  }

  const initialScanLimit = Math.max(
    conversationIds.length,
    conversationIds.length * INBOX_INITIAL_LAST_MESSAGE_SCAN_MULTIPLIER,
  );
  const { data: initialRows, error: initialRowsError } = await supabase
    .from("messages")
    .select("conversation_id, sender_id, content, created_at")
    .in("conversation_id", conversationIds)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(initialScanLimit);

  if (initialRowsError) {
    throw new Error("Failed to load conversation messages.");
  }

  for (const row of (initialRows ?? []) as MarketplaceLatestMessageLookupRow[]) {
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
          .from("messages")
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
        throw new Error("Failed to load conversation messages.");
      }

      if (fallbackResult.data) {
        latestByConversation.set(chunk[resultIndex], fallbackResult.data);
      }
    }
  }

  return latestByConversation;
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
    price: formatCompactListingPrice(listing.price_kzt, listing.pricing_model),
    listingTypeLabel: formatListingTypeLabel(listing.listing_type),
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

export async function getFeaturedListings(
  limit = 4,
  options: {
    listingType?: ListingType;
  } = {},
): Promise<ListingWithCoverRow[]> {
  const safeLimit = Math.max(1, Math.min(limit, 12));
  const supabase = await createClient();
  let query = supabase
    .from("listings")
    .select(LISTING_CARD_SELECT)
    .eq("status", "active")
    .eq("is_hidden", false)
    .eq("is_featured", true)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (options.listingType) {
    query = query.eq("listing_type", options.listingType);
  }

  const { data, error } = await query.limit(safeLimit);

  if (error) {
    throw new Error("Failed to load featured listings.");
  }

  const coverMap = await getCoverImageMap(
    supabase,
    data.map((listing) => listing.id),
  );

  return data.map((listing) => withCoverImage(listing, coverMap));
}

export async function getActiveListingsPage(
  page = 1,
  pageSize = 24,
  options: {
    excludeFeatured?: boolean;
    listingType?: ListingType;
  } = {},
): Promise<PaginatedListingResult> {
  const { from, to, pageSize: safePageSize } = createPaginationWindow({
    page,
    pageSize,
    defaultPageSize: 24,
    maxPageSize: 48,
  });
  const supabase = await createClient();

  let query = supabase
    .from("listings")
    .select(LISTING_CARD_SELECT)
    .eq("status", "active")
    .eq("is_hidden", false)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, to);

  if (options.excludeFeatured) {
    query = query.eq("is_featured", false);
  }

  if (options.listingType) {
    query = query.eq("listing_type", options.listingType);
  }

  const { data, error } = await query;

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
    .eq("is_hidden", false)
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

export async function getFeaturedListingsForReview(limit = 60): Promise<FeaturedListingReviewItem[]> {
  const user = await requireUser();
  if (!isAdminUser(user)) {
    throw new Error("Not authorized to manage featured listings.");
  }

  const safeLimit = Math.max(1, Math.min(limit, 120));
  const supabase = await createClient();
  const { data: listings, error: listingsError } = await supabase
    .from("listings")
    .select("id, title, price_kzt, listing_type, pricing_model, status, is_featured, seller_id, created_at")
    .eq("status", "active")
    .eq("is_hidden", false)
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(safeLimit);

  if (listingsError) {
    throw new Error("Failed to load listings for featuring.");
  }

  const sellerIds = dedupeStrings((listings ?? []).map((listing) => listing.seller_id));
  const profilesResult = sellerIds.length > 0
    ? await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", sellerIds)
    : {
        data: [] as Array<{ user_id: string; full_name: string | null }>,
        error: null,
      };

  if (profilesResult.error) {
    throw new Error("Failed to load listing sellers.");
  }

  const sellerNameById = new Map(
    (profilesResult.data ?? []).map((profile) => [profile.user_id, normalizeName(profile.full_name)]),
  );

  return (listings ?? []).map((listing) => ({
    id: listing.id,
    title: listing.title,
    priceKzt: listing.price_kzt,
    listingType: listing.listing_type,
    pricingModel: listing.pricing_model,
    status: listing.status,
    isFeatured: listing.is_featured,
    createdAt: listing.created_at,
    sellerName: sellerNameById.get(listing.seller_id) ?? "NU student",
  }));
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
      .select("user_id, full_name, school, major, year_label, avatar_path")
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

export async function getMarketplaceConversationsPage(
  page = 1,
  pageSize = 15,
): Promise<PaginatedMarketplaceConversationResult> {
  const startedAt = performance.now();
  let viewerId: string | null = null;
  let outcome: "success" | "error" = "success";

  try {
    const user = await requireUser();
    viewerId = user.id;
    const { from, to, pageSize: safePageSize } = createPaginationWindow({
      page,
      pageSize,
      defaultPageSize: 15,
      maxPageSize: 30,
    });
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("conversations")
      .select("id, listing_id, buyer_id, seller_id, created_at, updated_at")
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .order("updated_at", { ascending: false })
      .order("id", { ascending: false })
      .range(from, to);

    if (error) {
      throw new Error("Failed to load conversations.");
    }

    const paged = splitPaginatedRows(data, safePageSize);
    if (paged.rows.length === 0) {
      return {
        conversations: [],
        hasMore: false,
      };
    }

    const listingIds = dedupeStrings(paged.rows.map((conversation) => conversation.listing_id));
    const counterpartIds = dedupeStrings(
      paged.rows.map((conversation) =>
        conversation.buyer_id === user.id ? conversation.seller_id : conversation.buyer_id,
      ),
    );

    const conversationIds = dedupeStrings(paged.rows.map((conversation) => conversation.id));

    const [listingsResult, profilesResult, lastMessageMap] = await Promise.all([
      listingIds.length > 0
        ? supabase
            .from("listings")
            .select("id, title, price_kzt, listing_type, pricing_model, status")
            .in("id", listingIds)
        : Promise.resolve({ data: [] as ListingContextRow[], error: null }),
      counterpartIds.length > 0
        ? supabase
            .from("profiles")
            .select("user_id, full_name, avatar_path")
            .in("user_id", counterpartIds)
        : Promise.resolve({ data: [] as ProfileIdentity[], error: null }),
      getLatestMarketplaceMessagesByConversation(supabase, conversationIds),
    ]);

    if (listingsResult.error || profilesResult.error) {
      throw new Error("Failed to load conversation metadata.");
    }

    const listingMap = new Map((listingsResult.data ?? []).map((listing) => [listing.id, listing]));
    const counterpartMap = new Map((profilesResult.data ?? []).map((profile) => [profile.user_id, profile]));
    const coverImageMap = await getCoverImageMap(supabase, listingIds);

    return {
      conversations: paged.rows.map((conversation) => {
        const counterpartId =
          conversation.buyer_id === user.id ? conversation.seller_id : conversation.buyer_id;
        const listing = listingMap.get(conversation.listing_id);
        const counterpart = counterpartMap.get(counterpartId);
        const lastMessage = lastMessageMap.get(conversation.id);

        return {
          id: conversation.id,
          listingId: conversation.listing_id,
          listingTitle: listing?.title?.trim() || "Listing unavailable",
          listingPriceKzt: listing?.price_kzt ?? null,
          listingType: listing?.listing_type ?? null,
          pricingModel: listing?.pricing_model ?? null,
          listingStatus: listing?.status ?? null,
          listingCoverImageUrl: coverImageMap.get(conversation.listing_id) ?? null,
          counterpartId,
          counterpartName: normalizeName(counterpart?.full_name),
          counterpartAvatarPath: counterpart?.avatar_path ?? null,
          lastMessagePreview: toMessagePreview(lastMessage?.content ?? ""),
          lastMessageAt: lastMessage?.created_at ?? conversation.created_at,
          lastMessageCreatedAt: lastMessage?.created_at ?? null,
          lastMessageSenderId: lastMessage?.sender_id ?? conversation.buyer_id,
          updatedAt: conversation.updated_at,
        };
      }),
      hasMore: paged.hasMore,
    };
  } catch (error) {
    outcome = "error";
    logWarn("market", "marketplace_inbox_loader_failed", {
      action: "getMarketplaceConversationsPage",
      userId: viewerId,
      route: "/market/messages",
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
      logWarn("market", "marketplace_inbox_loader_slow", {
        action: "getMarketplaceConversationsPage",
        userId: viewerId,
        route: "/market/messages",
        durationMs,
        outcome,
      });
    }
  }
}

export async function getMarketplaceConversationThread(
  conversationId: string,
): Promise<MarketplaceConversationThread | null> {
  const startedAt = performance.now();
  let viewerId: string | null = null;
  let outcome: "success" | "error" = "success";

  try {
    const user = await requireUser();
    viewerId = user.id;
    const supabase = await createClient();

    const { data: conversation, error: conversationError } = await supabase
      .from("conversations")
      .select("id, listing_id, buyer_id, seller_id, created_at, updated_at")
      .eq("id", conversationId)
      .maybeSingle();

    if (conversationError) {
      throw new Error("Failed to load conversation.");
    }

    if (!conversation) {
      return null;
    }

    const isBuyer = conversation.buyer_id === user.id;
    const isSeller = conversation.seller_id === user.id;

    if (!isBuyer && !isSeller) {
      return null;
    }

    const counterpartId = isBuyer ? conversation.seller_id : conversation.buyer_id;

    const [listingResult, profilesResult, messagesResult, listingCoverMap] = await Promise.all([
      supabase
        .from("listings")
        .select("id, title, price_kzt, listing_type, pricing_model, status")
        .eq("id", conversation.listing_id)
        .maybeSingle(),
      supabase
        .from("profiles")
        .select("user_id, full_name, avatar_path")
        .in("user_id", dedupeStrings([conversation.buyer_id, conversation.seller_id])),
      supabase
        .from("messages")
        .select("id, conversation_id, sender_id, content, created_at")
        .eq("conversation_id", conversation.id)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .limit(200),
      getCoverImageMap(supabase, [conversation.listing_id]),
    ]);

    if (listingResult.error || profilesResult.error || messagesResult.error) {
      throw new Error("Failed to load conversation thread.");
    }

    const profileMap = new Map((profilesResult.data ?? []).map((profile) => [profile.user_id, profile]));
    const counterpartProfile = profileMap.get(counterpartId);
    const listingTitle = listingResult.data?.title?.trim() || "Listing unavailable";
    const listingHref = listingResult.data ? `/market/item/${listingResult.data.id}` : null;
    const listingCoverImageUrl = listingCoverMap.get(conversation.listing_id) ?? null;

    return {
      conversationId: conversation.id,
      listingId: conversation.listing_id,
      listingTitle,
      listingPriceKzt: listingResult.data?.price_kzt ?? null,
      listingType: listingResult.data?.listing_type ?? null,
      pricingModel: listingResult.data?.pricing_model ?? null,
      listingStatus: listingResult.data?.status ?? null,
      listingCoverImageUrl,
      listingHref,
      currentUserId: user.id,
      counterpartId,
      counterpartName: normalizeName(counterpartProfile?.full_name),
      counterpartAvatarPath: counterpartProfile?.avatar_path ?? null,
      messages: (messagesResult.data ?? []).map((message) => {
        const senderProfile = profileMap.get(message.sender_id);
        const isOwnMessage = message.sender_id === user.id;

        return {
          id: message.id,
          senderId: message.sender_id,
          senderName: isOwnMessage ? "You" : normalizeName(senderProfile?.full_name),
          senderAvatarPath: senderProfile?.avatar_path ?? null,
          content: message.content,
          createdAt: message.created_at,
          isOwnMessage,
        };
      }),
    };
  } catch (error) {
    outcome = "error";
    logWarn("market", "marketplace_thread_loader_failed", {
      action: "getMarketplaceConversationThread",
      userId: viewerId,
      route: `/market/messages/${conversationId}`,
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
      logWarn("market", "marketplace_thread_loader_slow", {
        action: "getMarketplaceConversationThread",
        userId: viewerId,
        route: `/market/messages/${conversationId}`,
        durationMs,
        outcome,
      });
    }
  }
}
