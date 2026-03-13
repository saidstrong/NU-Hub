import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import { isListingOwner } from "@/lib/market/ownership";
import { createPaginationWindow, splitPaginatedRows } from "@/lib/pagination";
import type { Database } from "@/types/database";

export type ListingRow = Database["public"]["Tables"]["listings"]["Row"];
export type ListingImageRow = Database["public"]["Tables"]["listing_images"]["Row"];
export type ConversationRow = Database["public"]["Tables"]["conversations"]["Row"];
export type MessageRow = Database["public"]["Tables"]["messages"]["Row"];
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
  "user_id" | "full_name" | "school" | "major" | "year_label" | "avatar_path"
>;
type ProfileIdentity = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "user_id" | "full_name" | "avatar_path"
>;
type ListingTitleRow = Pick<
  ListingRow,
  "id" | "title"
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
export type MarketplaceConversationListItem = {
  id: string;
  listingId: string;
  listingTitle: string;
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
  listingHref: string | null;
  currentUserId: string;
  counterpartId: string;
  counterpartName: string;
  counterpartAvatarPath: string | null;
  messages: MarketplaceThreadMessageItem[];
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

function dedupeStrings(values: string[]): string[] {
  return Array.from(new Set(values));
}

function normalizeName(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : "NU student";
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
  const user = await requireUser();
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

  const conversationIds = paged.rows.map((conversation) => conversation.id);
  const listingIds = dedupeStrings(paged.rows.map((conversation) => conversation.listing_id));
  const counterpartIds = dedupeStrings(
    paged.rows.map((conversation) =>
      conversation.buyer_id === user.id ? conversation.seller_id : conversation.buyer_id,
    ),
  );

  const [listingsResult, profilesResult, messagesResult] = await Promise.all([
    listingIds.length > 0
      ? supabase
          .from("listings")
          .select("id, title")
          .in("id", listingIds)
      : Promise.resolve({ data: [] as ListingTitleRow[], error: null }),
    counterpartIds.length > 0
      ? supabase
          .from("profiles")
          .select("user_id, full_name, avatar_path")
          .in("user_id", counterpartIds)
      : Promise.resolve({ data: [] as ProfileIdentity[], error: null }),
    supabase
      .from("messages")
      .select("id, conversation_id, sender_id, content, created_at")
      .in("conversation_id", conversationIds)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false }),
  ]);

  if (listingsResult.error || profilesResult.error || messagesResult.error) {
    throw new Error("Failed to load conversation metadata.");
  }

  const listingMap = new Map((listingsResult.data ?? []).map((listing) => [listing.id, listing]));
  const counterpartMap = new Map((profilesResult.data ?? []).map((profile) => [profile.user_id, profile]));
  const lastMessageMap = new Map<string, Pick<MessageRow, "content" | "created_at" | "sender_id">>();

  for (const message of messagesResult.data ?? []) {
    if (!lastMessageMap.has(message.conversation_id)) {
      lastMessageMap.set(message.conversation_id, {
        content: message.content,
        created_at: message.created_at,
        sender_id: message.sender_id,
      });
    }
  }

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
}

export async function getMarketplaceConversationThread(
  conversationId: string,
): Promise<MarketplaceConversationThread | null> {
  const user = await requireUser();
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

  const [listingResult, profilesResult, messagesResult] = await Promise.all([
    supabase
      .from("listings")
      .select("id, title")
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
  ]);

  if (listingResult.error || profilesResult.error || messagesResult.error) {
    throw new Error("Failed to load conversation thread.");
  }

  const profileMap = new Map((profilesResult.data ?? []).map((profile) => [profile.user_id, profile]));
  const counterpartProfile = profileMap.get(counterpartId);
  const listingTitle = listingResult.data?.title?.trim() || "Listing unavailable";
  const listingHref = listingResult.data ? `/market/item/${listingResult.data.id}` : null;

  return {
    conversationId: conversation.id,
    listingId: conversation.listing_id,
    listingTitle,
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
}
