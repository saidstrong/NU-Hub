"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  getStringValue,
  redirectWithError,
  redirectWithMessage,
  sanitizeInternalPath,
} from "@/lib/actions/helpers";
import { requireUser } from "@/lib/auth/session";
import { isListingOwner } from "@/lib/market/ownership";
import { createAppError } from "@/lib/observability/errors";
import {
  getDurationMs,
  logAppError,
  logInfo,
  logSecurityEvent,
  logWarn,
} from "@/lib/observability/logger";
import { getRequestContext } from "@/lib/observability/request-context";
import { getCurrentProfile } from "@/lib/profile/data";
import { consumeDistributedRateLimit, consumeRateLimit } from "@/lib/security/rate-limit";
import { createClient } from "@/lib/supabase/server";
import {
  isOwnerScopedListingImagePath,
  listingImageCountSchema,
  listingCreateSchema,
  listingMutationIdSchema,
  parseUploadedListingImagePaths,
  sendMarketplaceMessageSchema,
  startListingConversationSchema,
  listingUpdateSchema,
  toggleSavedListingSchema,
} from "@/lib/validation/market";
import {
  removeStorageObjectBestEffort,
} from "@/lib/validation/media";

const LISTING_IMAGES_BUCKET = "listing-images";
const CREATE_LISTING_BURST_LIMIT = {
  maxHits: 1,
  windowMs: 10 * 1000,
};
const CREATE_LISTING_WINDOW_LIMIT = {
  maxHits: 12,
  windowMs: 15 * 60 * 1000,
};
const UPDATE_LISTING_LIMIT = {
  maxHits: 30,
  windowMs: 15 * 60 * 1000,
};
const DELETE_LISTING_LIMIT = {
  maxHits: 8,
  windowMs: 30 * 60 * 1000,
};
const START_CONVERSATION_LIMIT = {
  maxHits: 30,
  windowMs: 10 * 60 * 1000,
};
const START_CONVERSATION_BURST_LIMIT = {
  maxHits: 6,
  windowMs: 15 * 1000,
};
const SEND_MESSAGE_LIMIT = {
  maxHits: 100,
  windowMs: 10 * 60 * 1000,
};
const SEND_MESSAGE_BURST_LIMIT = {
  maxHits: 12,
  windowMs: 15 * 1000,
};
const FEATURE_LISTING_LIMIT = {
  maxHits: 120,
  windowMs: 10 * 60 * 1000,
};
// Best-effort only in serverless: this in-memory limiter is instance-local.
const ACTION_SLOW_THRESHOLD_MS = 250;

function getRequestIdFromContext(context: Record<string, unknown>): string {
  return typeof context.requestId === "string" && context.requestId.length > 0
    ? context.requestId
    : "unknown";
}

function isAdminUser(user: Awaited<ReturnType<typeof requireUser>>): boolean {
  const metadata = user.app_metadata;
  if (!metadata || typeof metadata !== "object") {
    return false;
  }

  return (metadata as Record<string, unknown>).role === "admin";
}

function mapCreateListingErrorMessage(errorCode?: string): string {
  if (errorCode === "23503") {
    return "Your profile is not ready yet. Open your profile once and try again.";
  }

  return "Failed to create listing. Please try again.";
}

function mapUpdateListingErrorMessage(errorCode?: string): string {
  if (errorCode === "42501") {
    return "You do not have permission to edit this listing.";
  }

  return "Failed to update listing. Please try again.";
}

function mapDeleteListingErrorMessage(errorCode?: string): string {
  if (errorCode === "42501") {
    return "You do not have permission to delete this listing.";
  }

  return "Failed to delete listing. Please try again.";
}

function mapStartConversationErrorMessage(errorCode?: string): string {
  if (errorCode === "42501") {
    return "You cannot start a conversation for this listing.";
  }

  return "Failed to start conversation.";
}

function mapSendMessageErrorMessage(errorCode?: string): string {
  if (errorCode === "42501") {
    return "You cannot send messages in this conversation.";
  }

  if (errorCode === "23514") {
    return "Message cannot be empty.";
  }

  return "Failed to send message.";
}

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

function revalidateListingPaths(listingId: string) {
  revalidatePath("/home");
  revalidatePath("/market");
  revalidatePath("/market/my-listings");
  revalidatePath("/market/saved");
  revalidatePath(`/market/item/${listingId}`);
  revalidatePath(`/market/item/${listingId}/edit`);
}

async function verifyListingOwnershipOrRedirect(
  supabase: SupabaseServerClient,
  listingId: string,
  userId: string,
  onErrorPath: string,
  requestContext: Record<string, unknown>,
) {
  const { data: listing, error } = await supabase
    .from("listings")
    .select("id, seller_id")
    .eq("id", listingId)
    .maybeSingle();

  if (error) {
    redirectWithError(onErrorPath, "Failed to load listing.");
  }

  if (!listing) {
    redirectWithError(onErrorPath, "Listing not found.");
  }

  if (!isListingOwner(listing.seller_id, userId)) {
    logSecurityEvent("listing_ownership_violation", {
      ...requestContext,
      listingId,
      ownerId: listing.seller_id,
      actorId: userId,
    });
    redirectWithError(onErrorPath, "You can only manage your own listings.");
  }
}

async function cleanupFailedListingWithImages(
  supabase: Awaited<ReturnType<typeof createClient>>,
  listingId: string,
  uploadedPaths: string[],
) {
  if (uploadedPaths.length > 0) {
    for (const path of uploadedPaths) {
      await removeStorageObjectBestEffort(supabase, LISTING_IMAGES_BUCKET, path);
    }
  }

  await supabase
    .from("listing_images")
    .delete()
    .eq("listing_id", listingId);

  await supabase
    .from("listings")
    .delete()
    .eq("id", listingId);
}

async function createListingWithStatus(formData: FormData, status: "draft" | "active") {
  const requestContext = await getRequestContext({
    action: "createListingWithStatus",
    requestedStatus: status,
  });
  const startedAt = performance.now();
  const parsed = listingCreateSchema.safeParse({
    title: getStringValue(formData, "title"),
    category: getStringValue(formData, "category"),
    priceKzt: getStringValue(formData, "priceKzt"),
    listingType: getStringValue(formData, "listingType"),
    pricingModel: getStringValue(formData, "pricingModel"),
    condition: getStringValue(formData, "condition"),
    description: getStringValue(formData, "description"),
    pickupLocation: getStringValue(formData, "pickupLocation"),
    status,
  });

  if (!parsed.success) {
    redirectWithError("/market/post", parsed.error.issues[0]?.message ?? "Invalid listing input.");
  }

  const user = await requireUser();
  const burstRateResult = consumeRateLimit(
    `market:create-listing:burst:${user.id}`,
    CREATE_LISTING_BURST_LIMIT,
  );
  const windowRateResult = consumeRateLimit(
    `market:create-listing:window:${user.id}`,
    CREATE_LISTING_WINDOW_LIMIT,
  );

  if (!burstRateResult.allowed || !windowRateResult.allowed) {
    logSecurityEvent("listing_create_rate_limited", {
      ...requestContext,
      userId: user.id,
      retryAfterMs: Math.max(burstRateResult.retryAfterMs, windowRateResult.retryAfterMs),
    });
    redirectWithError("/market/post", "Too many listing submissions. Please wait and try again.");
  }

  const parsedUploadedImagePaths = parseUploadedListingImagePaths(
    getStringValue(formData, "uploadedImagePaths"),
  );

  if (parsedUploadedImagePaths.error) {
    redirectWithError("/market/post", parsedUploadedImagePaths.error);
  }

  const uploadedImagePaths = parsedUploadedImagePaths.paths;
  const parsedImageCount = listingImageCountSchema.safeParse(uploadedImagePaths.length);

  if (!parsedImageCount.success) {
    logWarn("market", "listing_create_invalid_image_count", {
      ...requestContext,
      action: "createListingWithStatus",
      userId: user.id,
      route: "/market/post",
      durationMs: getDurationMs(startedAt),
      outcome: "error",
      imageCount: uploadedImagePaths.length,
    });
    redirectWithError("/market/post", parsedImageCount.error.issues[0]?.message ?? "Invalid image count.");
  }

  for (const storagePath of uploadedImagePaths) {
    if (!isOwnerScopedListingImagePath(storagePath, user.id)) {
      logSecurityEvent("listing_upload_invalid_storage_path", {
        ...requestContext,
        userId: user.id,
        storagePath,
      });
      redirectWithError("/market/post", "Invalid uploaded image reference.");
    }
  }

  let sellerId: string;

  try {
    const profile = await getCurrentProfile();
    sellerId = profile.user_id;
  } catch (error) {
    logAppError(
      "market",
      "listing_create_profile_unavailable",
      createAppError("AUTH_ERROR", "Unable to load seller profile before listing creation.", {
        safeMessage: "Unable to load your profile. Please complete profile setup and try again.",
        cause: error,
      }),
      requestContext,
    );
    redirectWithError(
      "/market/post",
      "Unable to load your profile. Please complete profile setup and try again.",
    );
  }

  const supabase = await createClient();

  const { data: created, error } = await supabase
    .from("listings")
    .insert({
      seller_id: sellerId,
      title: parsed.data.title,
      description: parsed.data.description,
      price_kzt: parsed.data.priceKzt,
      listing_type: parsed.data.listingType,
      pricing_model: parsed.data.pricingModel,
      category: parsed.data.category,
      condition: parsed.data.condition,
      pickup_location: parsed.data.pickupLocation,
      status: parsed.data.status,
    })
    .select("id")
    .single();

  if (error || !created) {
    for (const storagePath of uploadedImagePaths) {
      await removeStorageObjectBestEffort(supabase, LISTING_IMAGES_BUCKET, storagePath);
    }

    logAppError(
      "market",
      "listing_create_failed",
      createAppError("DATABASE_ERROR", error?.message ?? "Listing insert returned empty response.", {
        safeMessage: mapCreateListingErrorMessage(error?.code),
        metadata: {
          code: error?.code ?? null,
          userId: sellerId,
        },
      }),
      requestContext,
    );
    redirectWithError("/market/post", mapCreateListingErrorMessage(error?.code));
  }

  if (uploadedImagePaths.length > 0) {
    const listingImageRows: Array<{
      listing_id: string;
      storage_path: string;
      sort_order: number;
    }> = [];

    for (const [index, storagePath] of uploadedImagePaths.entries()) {
      listingImageRows.push({
        listing_id: created.id,
        storage_path: storagePath,
        sort_order: index,
      });
    }

    const { error: imageRowsError } = await supabase
      .from("listing_images")
      .insert(listingImageRows);

    if (imageRowsError) {
      logAppError(
        "market",
        "listing_image_rows_insert_failed",
        createAppError("DATABASE_ERROR", imageRowsError.message, {
          safeMessage: "Failed to save listing images. Listing was not created. Please try again.",
          metadata: {
            listingId: created.id,
            userId: sellerId,
            code: imageRowsError.code,
          },
        }),
        requestContext,
      );
      await cleanupFailedListingWithImages(supabase, created.id, uploadedImagePaths);
      redirectWithError(
        "/market/post",
        "Failed to save listing images. Listing was not created. Please try again.",
      );
    }
  }

  revalidatePath("/market");
  revalidatePath("/market/my-listings");
  revalidatePath("/market/saved");
  revalidatePath(`/market/item/${created.id}`);
  const durationMs = getDurationMs(startedAt);
  const timingContext = {
    ...requestContext,
    action: "createListingWithStatus",
    userId: sellerId,
    route: "/market/post",
    durationMs,
    outcome: "success",
    listingId: created.id,
    status,
    imageCount: uploadedImagePaths.length,
  };
  logInfo("market", "listing_created", timingContext);
  if (durationMs > ACTION_SLOW_THRESHOLD_MS) {
    logWarn("market", "listing_create_slow", timingContext);
  }

  if (status === "draft") {
    redirect("/market/my-listings?status=active&message=Draft%20saved");
  }

  redirect(`/market/item/${created.id}?message=Listing%20published`);
}

export async function saveDraftListingAction(formData: FormData) {
  await createListingWithStatus(formData, "draft");
}

export async function publishListingAction(formData: FormData) {
  await createListingWithStatus(formData, "active");
}

export async function updateListingAction(formData: FormData) {
  const requestContext = await getRequestContext({ action: "updateListingAction" });
  const startedAt = performance.now();
  const parsedListingId = listingMutationIdSchema.safeParse({
    listingId: getStringValue(formData, "listingId"),
  });

  if (!parsedListingId.success) {
    redirectWithError("/market", parsedListingId.error.issues[0]?.message ?? "Invalid listing id.");
  }

  const listingId = parsedListingId.data.listingId;
  const editPath = `/market/item/${listingId}/edit`;
  const parsed = listingUpdateSchema.safeParse({
    title: getStringValue(formData, "title"),
    category: getStringValue(formData, "category"),
    priceKzt: getStringValue(formData, "priceKzt"),
    listingType: getStringValue(formData, "listingType"),
    pricingModel: getStringValue(formData, "pricingModel"),
    condition: getStringValue(formData, "condition"),
    description: getStringValue(formData, "description"),
    pickupLocation: getStringValue(formData, "pickupLocation"),
    status: getStringValue(formData, "status"),
  });

  if (!parsed.success) {
    redirectWithError(editPath, parsed.error.issues[0]?.message ?? "Invalid listing input.");
  }

  const user = await requireUser();
  const updateRateResult = consumeRateLimit(`market:update-listing:${user.id}`, UPDATE_LISTING_LIMIT);

  if (!updateRateResult.allowed) {
    logSecurityEvent("listing_update_rate_limited", {
      ...requestContext,
      userId: user.id,
      listingId,
      retryAfterMs: updateRateResult.retryAfterMs,
    });
    redirectWithError(editPath, "Too many update attempts. Please wait and try again.");
  }

  const supabase = await createClient();
  await verifyListingOwnershipOrRedirect(supabase, listingId, user.id, editPath, requestContext);

  const { data: updated, error: updateError } = await supabase
    .from("listings")
    .update({
      title: parsed.data.title,
      description: parsed.data.description,
      price_kzt: parsed.data.priceKzt,
      listing_type: parsed.data.listingType,
      pricing_model: parsed.data.pricingModel,
      category: parsed.data.category,
      condition: parsed.data.condition,
      pickup_location: parsed.data.pickupLocation,
      status: parsed.data.status,
    })
    .eq("id", listingId)
    .eq("seller_id", user.id)
    .select("id")
    .maybeSingle();

  if (updateError) {
    logAppError(
      "market",
      "listing_update_failed",
      createAppError("DATABASE_ERROR", updateError.message, {
        safeMessage: mapUpdateListingErrorMessage(updateError.code),
        metadata: {
          code: updateError.code,
          userId: user.id,
          listingId,
        },
      }),
      {
        ...requestContext,
        action: "updateListingAction",
        userId: user.id,
        route: editPath,
        durationMs: getDurationMs(startedAt),
        outcome: "error",
        listingId,
      },
    );
    redirectWithError(editPath, mapUpdateListingErrorMessage(updateError.code));
  }

  if (!updated) {
    logWarn("market", "listing_update_missing_row", {
      ...requestContext,
      action: "updateListingAction",
      userId: user.id,
      route: editPath,
      durationMs: getDurationMs(startedAt),
      outcome: "error",
      listingId,
    });
    redirectWithError(editPath, "Listing not found.");
  }

  revalidateListingPaths(listingId);
  const durationMs = getDurationMs(startedAt);
  const timingContext = {
    ...requestContext,
    action: "updateListingAction",
    userId: user.id,
    route: editPath,
    durationMs,
    outcome: "success",
    listingId,
    status: parsed.data.status,
  };
  logInfo("market", "listing_updated", timingContext);
  if (durationMs > ACTION_SLOW_THRESHOLD_MS) {
    logWarn("market", "listing_update_slow", timingContext);
  }
  redirectWithMessage(`/market/item/${listingId}`, "Listing updated");
}

export async function deleteListingAction(formData: FormData) {
  const requestContext = await getRequestContext({ action: "deleteListingAction" });
  const parsed = listingMutationIdSchema.safeParse({
    listingId: getStringValue(formData, "listingId"),
  });

  if (!parsed.success) {
    redirectWithError("/market", parsed.error.issues[0]?.message ?? "Invalid listing id.");
  }

  const listingId = parsed.data.listingId;
  const editPath = `/market/item/${listingId}/edit`;
  const user = await requireUser();
  const deleteRateResult = consumeRateLimit(`market:delete-listing:${user.id}`, DELETE_LISTING_LIMIT);

  if (!deleteRateResult.allowed) {
    logSecurityEvent("listing_delete_rate_limited", {
      ...requestContext,
      userId: user.id,
      listingId,
      retryAfterMs: deleteRateResult.retryAfterMs,
    });
    redirectWithError(editPath, "Too many delete attempts. Please wait and try again.");
  }

  const supabase = await createClient();
  await verifyListingOwnershipOrRedirect(supabase, listingId, user.id, editPath, requestContext);

  const { data: deleted, error: deleteError } = await supabase
    .from("listings")
    .delete()
    .eq("id", listingId)
    .eq("seller_id", user.id)
    .select("id")
    .maybeSingle();

  if (deleteError) {
    logAppError(
      "market",
      "listing_delete_failed",
      createAppError("DATABASE_ERROR", deleteError.message, {
        safeMessage: mapDeleteListingErrorMessage(deleteError.code),
        metadata: {
          code: deleteError.code,
          userId: user.id,
          listingId,
        },
      }),
      requestContext,
    );
    redirectWithError(editPath, mapDeleteListingErrorMessage(deleteError.code));
  }

  if (!deleted) {
    logWarn("market", "listing_delete_missing_row", {
      ...requestContext,
      userId: user.id,
      listingId,
    });
    redirectWithError(editPath, "Listing not found.");
  }

  revalidateListingPaths(listingId);
  logInfo("market", "listing_deleted", {
    ...requestContext,
    userId: user.id,
    listingId,
  });
  redirectWithMessage("/market/my-listings", "Listing deleted");
}

export async function startListingConversationAction(formData: FormData) {
  const requestContext = await getRequestContext({ action: "startListingConversationAction" });
  const parsed = startListingConversationSchema.safeParse({
    listingId: getStringValue(formData, "listingId"),
    redirectTo: getStringValue(formData, "redirectTo"),
  });

  if (!parsed.success) {
    redirectWithError("/market", parsed.error.issues[0]?.message ?? "Invalid conversation request.");
  }

  const listingPath = `/market/item/${parsed.data.listingId}`;
  const redirectPath = sanitizeInternalPath(parsed.data.redirectTo, listingPath);
  const user = await requireUser();
  const requestId = getRequestIdFromContext(requestContext);
  const burstRateResult = await consumeDistributedRateLimit(
    `market:start-conversation:burst:${user.id}:${parsed.data.listingId}`,
    START_CONVERSATION_BURST_LIMIT,
    {
      action: "startListingConversationAction",
      userId: user.id,
      targetId: parsed.data.listingId,
      requestId,
    },
  );
  const rateResult = await consumeDistributedRateLimit(
    `market:start-conversation:${user.id}`,
    START_CONVERSATION_LIMIT,
    {
      action: "startListingConversationAction",
      userId: user.id,
      targetId: parsed.data.listingId,
      requestId,
    },
  );

  if (!burstRateResult.allowed || !rateResult.allowed) {
    logSecurityEvent("market_start_conversation_rate_limited", {
      ...requestContext,
      userId: user.id,
      listingId: parsed.data.listingId,
      retryAfterMs: Math.max(burstRateResult.retryAfterMs, rateResult.retryAfterMs),
    });
    redirectWithError(redirectPath, "Too many conversation attempts. Please wait and try again.");
  }

  const supabase = await createClient();
  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .select("id, seller_id")
    .eq("id", parsed.data.listingId)
    .maybeSingle();

  if (listingError || !listing) {
    redirectWithError(redirectPath, "Listing not available.");
  }

  if (listing.seller_id === user.id) {
    logSecurityEvent("market_start_conversation_self_listing_blocked", {
      ...requestContext,
      userId: user.id,
      listingId: parsed.data.listingId,
    });
    redirectWithError(redirectPath, "You cannot message your own listing.");
  }

  const { data: existingConversation, error: existingConversationError } = await supabase
    .from("conversations")
    .select("id")
    .eq("listing_id", listing.id)
    .eq("buyer_id", user.id)
    .maybeSingle();

  if (existingConversationError) {
    logAppError(
      "market",
      "conversation_lookup_failed",
      createAppError("DATABASE_ERROR", existingConversationError.message, {
        safeMessage: "Failed to start conversation.",
        metadata: {
          code: existingConversationError.code,
          userId: user.id,
          listingId: listing.id,
        },
      }),
      requestContext,
    );
    redirectWithError(redirectPath, "Failed to start conversation.");
  }

  if (existingConversation) {
    redirect(`/market/messages/${existingConversation.id}`);
  }

  const { data: createdConversation, error: createConversationError } = await supabase
    .from("conversations")
    .insert({
      listing_id: listing.id,
      buyer_id: user.id,
      seller_id: listing.seller_id,
    })
    .select("id")
    .maybeSingle();

  if (createConversationError?.code === "23505") {
    const { data: racedConversation, error: raceLookupError } = await supabase
      .from("conversations")
      .select("id")
      .eq("listing_id", listing.id)
      .eq("buyer_id", user.id)
      .maybeSingle();

    if (raceLookupError || !racedConversation) {
      redirectWithError(redirectPath, "Failed to open conversation.");
    }

    redirect(`/market/messages/${racedConversation.id}`);
  }

  if (createConversationError || !createdConversation) {
    logAppError(
      "market",
      "conversation_create_failed",
      createAppError("DATABASE_ERROR", createConversationError?.message ?? "Conversation insert returned empty response.", {
        safeMessage: mapStartConversationErrorMessage(createConversationError?.code),
        metadata: {
          code: createConversationError?.code ?? null,
          userId: user.id,
          listingId: listing.id,
        },
      }),
      requestContext,
    );
    redirectWithError(redirectPath, mapStartConversationErrorMessage(createConversationError?.code));
  }

  logInfo("market", "conversation_started", {
    ...requestContext,
    userId: user.id,
    listingId: listing.id,
    conversationId: createdConversation.id,
  });
  redirect(`/market/messages/${createdConversation.id}`);
}

export async function sendMarketplaceMessageAction(formData: FormData) {
  const requestContext = await getRequestContext({ action: "sendMarketplaceMessageAction" });
  const startedAt = performance.now();
  const parsed = sendMarketplaceMessageSchema.safeParse({
    conversationId: getStringValue(formData, "conversationId"),
    content: getStringValue(formData, "content"),
    redirectTo: getStringValue(formData, "redirectTo"),
  });

  if (!parsed.success) {
    redirectWithError("/market/messages", parsed.error.issues[0]?.message ?? "Invalid message input.");
  }

  const conversationPath = `/market/messages/${parsed.data.conversationId}`;
  const redirectPath = sanitizeInternalPath(parsed.data.redirectTo, conversationPath);
  const user = await requireUser();
  const requestId = getRequestIdFromContext(requestContext);
  const burstRateResult = await consumeDistributedRateLimit(
    `market:send-message:burst:${user.id}:${parsed.data.conversationId}`,
    SEND_MESSAGE_BURST_LIMIT,
    {
      action: "sendMarketplaceMessageAction",
      userId: user.id,
      targetId: parsed.data.conversationId,
      requestId,
    },
  );
  const rateResult = await consumeDistributedRateLimit(
    `market:send-message:${user.id}`,
    SEND_MESSAGE_LIMIT,
    {
      action: "sendMarketplaceMessageAction",
      userId: user.id,
      targetId: parsed.data.conversationId,
      requestId,
    },
  );

  if (!burstRateResult.allowed || !rateResult.allowed) {
    logSecurityEvent("market_send_message_rate_limited", {
      ...requestContext,
      action: "sendMarketplaceMessageAction",
      userId: user.id,
      route: conversationPath,
      durationMs: getDurationMs(startedAt),
      outcome: "rate_limited",
      conversationId: parsed.data.conversationId,
      retryAfterMs: Math.max(burstRateResult.retryAfterMs, rateResult.retryAfterMs),
    });
    redirectWithError(redirectPath, "Too many messages. Please wait and try again.");
  }

  const supabase = await createClient();
  const { data: conversation, error: conversationError } = await supabase
    .from("conversations")
    .select("id, buyer_id, seller_id")
    .eq("id", parsed.data.conversationId)
    .maybeSingle();

  if (conversationError) {
    logWarn("market", "market_message_conversation_load_failed", {
      ...requestContext,
      action: "sendMarketplaceMessageAction",
      userId: user.id,
      route: conversationPath,
      durationMs: getDurationMs(startedAt),
      outcome: "error",
      errorCode: conversationError.code ?? null,
      conversationId: parsed.data.conversationId,
    });
    redirectWithError(redirectPath, "Failed to load conversation.");
  }

  if (!conversation) {
    logWarn("market", "market_message_conversation_missing", {
      ...requestContext,
      action: "sendMarketplaceMessageAction",
      userId: user.id,
      route: conversationPath,
      durationMs: getDurationMs(startedAt),
      outcome: "error",
      conversationId: parsed.data.conversationId,
    });
    redirectWithError("/market/messages", "Conversation not found.");
  }

  const isParticipant = conversation.buyer_id === user.id || conversation.seller_id === user.id;
  if (!isParticipant) {
    logSecurityEvent("market_send_message_membership_violation", {
      ...requestContext,
      action: "sendMarketplaceMessageAction",
      userId: user.id,
      route: conversationPath,
      durationMs: getDurationMs(startedAt),
      outcome: "error",
      conversationId: parsed.data.conversationId,
      buyerId: conversation.buyer_id,
      sellerId: conversation.seller_id,
    });
    redirectWithError("/market/messages", "You cannot send messages in this conversation.");
  }

  const { error: insertMessageError } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversation.id,
      sender_id: user.id,
      content: parsed.data.content,
    });

  if (insertMessageError) {
    logAppError(
      "market",
      "message_send_failed",
      createAppError("DATABASE_ERROR", insertMessageError.message, {
        safeMessage: mapSendMessageErrorMessage(insertMessageError.code),
        metadata: {
          code: insertMessageError.code,
          action: "sendMarketplaceMessageAction",
          userId: user.id,
          route: conversationPath,
          durationMs: getDurationMs(startedAt),
          outcome: "error",
          conversationId: conversation.id,
        },
      }),
      {
        ...requestContext,
        action: "sendMarketplaceMessageAction",
        userId: user.id,
        route: conversationPath,
        durationMs: getDurationMs(startedAt),
        outcome: "error",
        conversationId: conversation.id,
      },
    );
    redirectWithError(redirectPath, mapSendMessageErrorMessage(insertMessageError.code));
  }

  const durationMs = getDurationMs(startedAt);
  const timingContext = {
    ...requestContext,
    action: "sendMarketplaceMessageAction",
    userId: user.id,
    route: conversationPath,
    durationMs,
    outcome: "success",
    conversationId: conversation.id,
  };
  logInfo("market", "message_sent", timingContext);
  if (durationMs > ACTION_SLOW_THRESHOLD_MS) {
    logWarn("market", "market_message_send_slow", timingContext);
  }
  revalidatePath("/market/messages");
  revalidatePath(`/market/messages/${conversation.id}`);
  if (redirectPath !== conversationPath) {
    redirect(redirectPath);
  }
}

export async function toggleSavedListingAction(formData: FormData) {
  const parsed = toggleSavedListingSchema.safeParse({
    listingId: getStringValue(formData, "listingId"),
    redirectTo: getStringValue(formData, "redirectTo"),
  });

  if (!parsed.success) {
    redirectWithError("/market", parsed.error.issues[0]?.message ?? "Invalid save request.");
  }

  const user = await requireUser();
  const supabase = await createClient();

  const { data: existing, error: existingError } = await supabase
    .from("saved_listings")
    .select("listing_id")
    .eq("user_id", user.id)
    .eq("listing_id", parsed.data.listingId)
    .maybeSingle();

  if (existingError) {
    redirectWithError("/market", "Failed to check saved listing.");
  }

  if (existing) {
    const { error: deleteError } = await supabase
      .from("saved_listings")
      .delete()
      .eq("user_id", user.id)
      .eq("listing_id", parsed.data.listingId);

    if (deleteError) {
      redirectWithError("/market", "Failed to unsave listing.");
    }
  } else {
    const { error: insertError } = await supabase
      .from("saved_listings")
      .insert({
        user_id: user.id,
        listing_id: parsed.data.listingId,
      });

    if (insertError?.code === "23505") {
      const redirectTo = sanitizeInternalPath(
        parsed.data.redirectTo,
        `/market/item/${parsed.data.listingId}`,
      );
      redirect(redirectTo);
    }

    if (insertError) {
      redirectWithError("/market", "Failed to save listing.");
    }
  }

  revalidatePath("/market/saved");
  revalidatePath(`/market/item/${parsed.data.listingId}`);

  const redirectTo = sanitizeInternalPath(
    parsed.data.redirectTo,
    `/market/item/${parsed.data.listingId}`,
  );

  redirect(redirectTo);
}

export async function setListingFeaturedAction(formData: FormData) {
  const requestContext = await getRequestContext({ action: "setListingFeaturedAction" });
  const parsedListingId = listingMutationIdSchema.safeParse({
    listingId: getStringValue(formData, "listingId"),
  });

  if (!parsedListingId.success) {
    redirectWithError("/profile/moderation", parsedListingId.error.issues[0]?.message ?? "Invalid listing id.");
  }

  const listingId = parsedListingId.data.listingId;
  const redirectPath = sanitizeInternalPath(
    getStringValue(formData, "redirectTo"),
    "/profile/moderation",
  );
  const isFeaturedInput = getStringValue(formData, "isFeaturedInput");
  if (isFeaturedInput !== "true" && isFeaturedInput !== "false") {
    redirectWithError(redirectPath, "Invalid featured state.");
  }

  const user = await requireUser();
  if (!isAdminUser(user)) {
    logSecurityEvent("market_feature_listing_admin_violation", {
      ...requestContext,
      userId: user.id,
      listingId,
    });
    redirectWithError(redirectPath, "Not authorized.");
  }

  const rateResult = consumeRateLimit(`market:feature-listing:${user.id}`, FEATURE_LISTING_LIMIT);
  if (!rateResult.allowed) {
    redirectWithError(redirectPath, "Too many moderation actions. Please wait and try again.");
  }

  const supabase = await createClient();
  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .select("id, status, is_hidden")
    .eq("id", listingId)
    .maybeSingle();

  if (listingError) {
    redirectWithError(redirectPath, "Failed to load listing.");
  }

  if (!listing) {
    redirectWithError(redirectPath, "Listing not found.");
  }

  const nextIsFeatured = isFeaturedInput === "true";
  if (nextIsFeatured && (listing.status !== "active" || listing.is_hidden)) {
    redirectWithError(redirectPath, "Only visible active listings can be featured.");
  }

  const { data: updated, error: updateError } = await supabase
    .from("listings")
    .update({
      is_featured: nextIsFeatured,
    })
    .eq("id", listingId)
    .select("id")
    .maybeSingle();

  if (updateError) {
    redirectWithError(redirectPath, "Failed to update featured state.");
  }

  if (!updated) {
    redirectWithError(redirectPath, "Listing not found.");
  }

  revalidatePath("/home");
  revalidatePath("/market");
  revalidatePath("/profile/moderation");
  revalidatePath(`/market/item/${listingId}`);
  redirectWithMessage(
    redirectPath,
    nextIsFeatured ? "Listing marked as featured." : "Featured status removed.",
  );
}
