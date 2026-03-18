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
import { isCommunityOwner } from "@/lib/connect/ownership";
import { isAdminUser } from "@/lib/moderation/data";
import { createAppError } from "@/lib/observability/errors";
import {
  getDurationMs,
  logAppError,
  logInfo,
  logSecurityEvent,
  logWarn,
} from "@/lib/observability/logger";
import { getRequestContext } from "@/lib/observability/request-context";
import { writeInAppNotification } from "@/lib/notifications/write";
import { consumeDistributedRateLimit, consumeRateLimit } from "@/lib/security/rate-limit";
import { createClient } from "@/lib/supabase/server";
import {
  acceptFriendRequestSchema,
  cancelFriendRequestSchema,
  communityMutationIdSchema,
  createCommunitySchema,
  sendFriendMessageSchema,
  startFriendConversationSchema,
  rejectFriendRequestSchema,
  sendFriendRequestSchema,
  communityJoinSchema,
  communityRequestReviewSchema,
  createCommunityPostSchema,
  clearCommunityFormalStatusSchema,
  deleteCommunityPostSchema,
  setCommunityFormalKindSchema,
  updateCommunitySchema,
} from "@/lib/validation/connect";
import {
  AVATAR_MAX_SIZE_BYTES,
  createMediaFilename,
  hasValidImageSignature,
  isSafeStoragePath,
  removeStorageObjectBestEffort,
  validateImageFileMeta,
} from "@/lib/validation/media";

const AVATARS_BUCKET = "avatars";

async function deleteCommunityOnCreateFailure(
  supabase: Awaited<ReturnType<typeof createClient>>,
  communityId: string,
  uploadedAvatarPath: string | null = null,
) {
  if (uploadedAvatarPath) {
    await removeStorageObjectBestEffort(supabase, AVATARS_BUCKET, uploadedAvatarPath);
  }
  await supabase.from("communities").delete().eq("id", communityId);
}

const CREATE_COMMUNITY_BURST_LIMIT = {
  maxHits: 1,
  windowMs: 10 * 1000,
};

const CREATE_COMMUNITY_WINDOW_LIMIT = {
  maxHits: 4,
  windowMs: 15 * 60 * 1000,
};

const COMMUNITY_JOIN_LIMIT = {
  maxHits: 25,
  windowMs: 10 * 60 * 1000,
};

const COMMUNITY_REVIEW_LIMIT = {
  maxHits: 60,
  windowMs: 10 * 60 * 1000,
};

const COMMUNITY_UPDATE_LIMIT = {
  maxHits: 24,
  windowMs: 15 * 60 * 1000,
};

const COMMUNITY_DELETE_LIMIT = {
  maxHits: 8,
  windowMs: 30 * 60 * 1000,
};

const COMMUNITY_POST_CREATE_LIMIT = {
  maxHits: 20,
  windowMs: 10 * 60 * 1000,
};
const COMMUNITY_POST_CREATE_BURST_LIMIT = {
  maxHits: 4,
  windowMs: 30 * 1000,
};

const COMMUNITY_POST_DELETE_LIMIT = {
  maxHits: 30,
  windowMs: 10 * 60 * 1000,
};

const FRIEND_REQUEST_SEND_LIMIT = {
  maxHits: 40,
  windowMs: 10 * 60 * 1000,
};

const FRIEND_REQUEST_REVIEW_LIMIT = {
  maxHits: 80,
  windowMs: 10 * 60 * 1000,
};

const FRIEND_CONVERSATION_START_LIMIT = {
  maxHits: 40,
  windowMs: 10 * 60 * 1000,
};
const FRIEND_CONVERSATION_START_BURST_LIMIT = {
  maxHits: 6,
  windowMs: 15 * 1000,
};

const FRIEND_MESSAGE_SEND_LIMIT = {
  maxHits: 120,
  windowMs: 10 * 60 * 1000,
};
const FRIEND_MESSAGE_SEND_BURST_LIMIT = {
  maxHits: 12,
  windowMs: 15 * 1000,
};
// Best-effort only in serverless: this in-memory limiter is instance-local.
const ACTION_SLOW_THRESHOLD_MS = 250;

function getRequestIdFromContext(context: Record<string, unknown>): string {
  return typeof context.requestId === "string" && context.requestId.length > 0
    ? context.requestId
    : "unknown";
}

function mapUpdateCommunityErrorMessage(errorCode?: string): string {
  if (errorCode === "42501") {
    return "You do not have permission to edit this community.";
  }

  return "Failed to update community.";
}

function mapDeleteCommunityErrorMessage(errorCode?: string): string {
  if (errorCode === "42501") {
    return "You do not have permission to delete this community.";
  }

  return "Failed to delete community.";
}

function mapCreateCommunityPostErrorMessage(errorCode?: string): string {
  if (errorCode === "42501") {
    return "Only joined members can post in this community.";
  }

  if (errorCode === "23514") {
    return "Post cannot be empty.";
  }

  return "Failed to publish post.";
}

function mapDeleteCommunityPostErrorMessage(errorCode?: string): string {
  if (errorCode === "42501") {
    return "You do not have permission to delete this post.";
  }

  return "Failed to delete post.";
}

function mapCommunityCurationErrorMessage(errorCode?: string): string {
  if (errorCode === "42501") {
    return "Only admins can curate community trust labels.";
  }

  return "Failed to update community curation.";
}

function formatFormalKindLabel(formalKind: "club" | "organization" | "official"): string {
  if (formalKind === "club") return "Club";
  if (formalKind === "organization") return "Organization";
  return "Official";
}

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

function revalidateCommunityPaths(communityId: string) {
  revalidatePath("/connect");
  revalidatePath("/connect/communities");
  revalidatePath("/connect/my-communities");
  revalidatePath("/connect/communities/requests");
  revalidatePath(`/connect/communities/${communityId}`);
  revalidatePath(`/connect/communities/${communityId}/edit`);
  revalidatePath("/profile/notifications");
}

function revalidateCommunityCurationPaths(communityId: string) {
  revalidateCommunityPaths(communityId);
  revalidatePath("/home");
  revalidatePath("/search");
  revalidatePath("/profile/moderation");
}

function revalidateFriendPaths(userId: string, otherUserId?: string) {
  revalidatePath("/connect");
  revalidatePath("/connect/people");
  revalidatePath("/connect/friends");
  revalidatePath(`/connect/people/${userId}`);
  if (otherUserId && otherUserId !== userId) {
    revalidatePath(`/connect/people/${otherUserId}`);
  }
}

function mapFriendRequestErrorMessage(errorCode?: string): string {
  if (errorCode === "23505") {
    return "A friend relationship already exists for this pair.";
  }

  if (errorCode === "42501") {
    return "You do not have permission for this friend action.";
  }

  return "Failed to update friend request.";
}

function mapFriendConversationErrorMessage(errorCode?: string): string {
  if (errorCode === "42501") {
    return "You cannot start a conversation with this user.";
  }

  if (errorCode === "23505") {
    return "Conversation already exists.";
  }

  return "Failed to start conversation.";
}

function mapFriendMessageErrorMessage(errorCode?: string): string {
  if (errorCode === "42501") {
    return "You cannot send messages in this conversation.";
  }

  if (errorCode === "23514") {
    return "Message cannot be empty.";
  }

  return "Failed to send message.";
}

function revalidateFriendMessagingPaths(conversationId: string) {
  revalidatePath("/connect/messages");
  revalidatePath(`/connect/messages/${conversationId}`);
}

function getOptionalFile(formData: FormData, key: string): File | null {
  const value = formData.get(key);
  if (!(value instanceof File) || value.size <= 0) {
    return null;
  }

  return value;
}

async function verifyCommunityOwnershipOrRedirect(
  supabase: SupabaseServerClient,
  communityId: string,
  userId: string,
  onErrorPath: string,
  requestContext: Record<string, unknown>,
) {
  const { data: community, error } = await supabase
    .from("communities")
    .select("id, created_by, avatar_path")
    .eq("id", communityId)
    .maybeSingle();

  if (error) {
    redirectWithError(onErrorPath, "Failed to load community.");
  }

  if (!community) {
    redirectWithError(onErrorPath, "Community not found.");
  }

  if (!isCommunityOwner(community.created_by, userId)) {
    logSecurityEvent("community_ownership_violation", {
      ...requestContext,
      communityId,
      ownerId: community.created_by,
      actorId: userId,
    });
    redirectWithError(onErrorPath, "You can only manage your own community.");
  }

  return community;
}

async function getFriendshipBetweenUsers(
  supabase: SupabaseServerClient,
  firstUserId: string,
  secondUserId: string,
) {
  const { data, error } = await supabase
    .from("friendships")
    .select("id, requester_id, addressee_id, status")
    .or(
      `and(requester_id.eq.${firstUserId},addressee_id.eq.${secondUserId}),and(requester_id.eq.${secondUserId},addressee_id.eq.${firstUserId})`,
    )
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function getAcceptedFriendshipBetweenUsers(
  supabase: SupabaseServerClient,
  firstUserId: string,
  secondUserId: string,
) {
  const { data, error } = await supabase
    .from("friendships")
    .select("id, requester_id, addressee_id, status")
    .or(
      `and(requester_id.eq.${firstUserId},addressee_id.eq.${secondUserId}),and(requester_id.eq.${secondUserId},addressee_id.eq.${firstUserId})`,
    )
    .eq("status", "accepted")
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function createCommunityAction(formData: FormData) {
  const requestContext = await getRequestContext({ action: "createCommunityAction" });
  const parsed = createCommunitySchema.safeParse({
    name: getStringValue(formData, "name"),
    description: getStringValue(formData, "description"),
    category: getStringValue(formData, "category"),
    tagsInput: getStringValue(formData, "tagsInput"),
    joinType: getStringValue(formData, "joinType"),
  });

  if (!parsed.success) {
    redirectWithError(
      "/connect/communities/create",
      parsed.error.issues[0]?.message ?? "Invalid community input.",
    );
  }

  const user = await requireUser();
  const avatarFile = getOptionalFile(formData, "avatar");

  if (avatarFile) {
    const imageMetaError = validateImageFileMeta(avatarFile, AVATAR_MAX_SIZE_BYTES);
    if (imageMetaError) {
      redirectWithError("/connect/communities/create", imageMetaError);
    }

    const hasValidSignature = await hasValidImageSignature(avatarFile);
    if (!hasValidSignature) {
      redirectWithError(
        "/connect/communities/create",
        "Invalid image content. Upload JPEG, PNG, or WEBP files only.",
      );
    }
  }

  const burstRateResult = consumeRateLimit(
    `connect:create-community:burst:${user.id}`,
    CREATE_COMMUNITY_BURST_LIMIT,
  );
  const windowRateResult = consumeRateLimit(
    `connect:create-community:window:${user.id}`,
    CREATE_COMMUNITY_WINDOW_LIMIT,
  );

  if (!burstRateResult.allowed || !windowRateResult.allowed) {
    logSecurityEvent("community_create_rate_limited", {
      ...requestContext,
      userId: user.id,
      retryAfterMs: Math.max(burstRateResult.retryAfterMs, windowRateResult.retryAfterMs),
    });
    redirectWithError("/connect/communities/create", "Too many create attempts. Please wait and try again.");
  }

  const supabase = await createClient();

  const { data: community, error: communityInsertError } = await supabase
    .from("communities")
    .insert({
      created_by: user.id,
      name: parsed.data.name,
      description: parsed.data.description,
      category: parsed.data.category,
      tags: parsed.data.tagsInput,
      join_type: parsed.data.joinType,
    })
    .select("id")
    .single();

  if (communityInsertError || !community) {
    logAppError(
      "connect",
      "community_create_failed",
      createAppError("DATABASE_ERROR", communityInsertError?.message ?? "Community insert returned empty response.", {
        safeMessage: "Failed to create community.",
        metadata: {
          code: communityInsertError?.code ?? null,
          userId: user.id,
        },
      }),
      requestContext,
    );
    redirectWithError("/connect/communities/create", "Failed to create community.");
  }

  let uploadedAvatarPath: string | null = null;
  if (avatarFile) {
    uploadedAvatarPath = `${user.id}/communities/${community.id}/${createMediaFilename("avatar", avatarFile)}`;
    if (!isSafeStoragePath(uploadedAvatarPath)) {
      await deleteCommunityOnCreateFailure(supabase, community.id);
      redirectWithError("/connect/communities/create", "Invalid community avatar path.");
    }
    const { error: avatarUploadError } = await supabase.storage
      .from(AVATARS_BUCKET)
      .upload(uploadedAvatarPath, avatarFile, {
        upsert: false,
        contentType: avatarFile.type,
      });

    if (avatarUploadError) {
      await deleteCommunityOnCreateFailure(supabase, community.id);
      redirectWithError("/connect/communities/create", "Failed to upload community avatar.");
    }

    const { error: avatarPathUpdateError } = await supabase
      .from("communities")
      .update({ avatar_path: uploadedAvatarPath })
      .eq("id", community.id)
      .eq("created_by", user.id);

    if (avatarPathUpdateError) {
      await deleteCommunityOnCreateFailure(supabase, community.id, uploadedAvatarPath);
      redirectWithError("/connect/communities/create", "Failed to save community avatar.");
    }
  }

  const { error: memberInsertError } = await supabase
    .from("community_members")
    .insert({
      community_id: community.id,
      user_id: user.id,
      role: "member",
      status: "pending",
    });

  if (memberInsertError) {
    logAppError(
      "connect",
      "community_owner_membership_init_failed",
      createAppError("DATABASE_ERROR", memberInsertError.message, {
        safeMessage: "Failed to initialize community owner access.",
        metadata: {
          code: memberInsertError.code,
          communityId: community.id,
          userId: user.id,
        },
      }),
      requestContext,
    );
    await deleteCommunityOnCreateFailure(supabase, community.id, uploadedAvatarPath);
    redirectWithError("/connect/communities/create", "Failed to initialize community owner access.");
  }

  const { error: ownerUpdateError } = await supabase
    .from("community_members")
    .update({
      role: "owner",
      status: "joined",
    })
    .eq("community_id", community.id)
    .eq("user_id", user.id);

  if (ownerUpdateError) {
    logAppError(
      "connect",
      "community_owner_membership_finalize_failed",
      createAppError("DATABASE_ERROR", ownerUpdateError.message, {
        safeMessage: "Failed to finalize community owner access.",
        metadata: {
          code: ownerUpdateError.code,
          communityId: community.id,
          userId: user.id,
        },
      }),
      requestContext,
    );
    await deleteCommunityOnCreateFailure(supabase, community.id, uploadedAvatarPath);
    redirectWithError("/connect/communities/create", "Failed to finalize community owner access.");
  }

  revalidatePath("/connect");
  revalidatePath("/connect/communities");
  revalidatePath("/connect/my-communities");
  revalidatePath(`/connect/communities/${community.id}`);

  logInfo("connect", "community_created", {
    ...requestContext,
    userId: user.id,
    communityId: community.id,
  });
  redirectWithMessage(`/connect/communities/${community.id}`, "Community created.");
}

export async function updateCommunityAction(formData: FormData) {
  const requestContext = await getRequestContext({ action: "updateCommunityAction" });
  const parsedCommunityId = communityMutationIdSchema.safeParse({
    communityId: getStringValue(formData, "communityId"),
  });

  if (!parsedCommunityId.success) {
    redirectWithError("/connect/communities", parsedCommunityId.error.issues[0]?.message ?? "Invalid community id.");
  }

  const communityId = parsedCommunityId.data.communityId;
  const editPath = `/connect/communities/${communityId}/edit`;
  const parsed = updateCommunitySchema.safeParse({
    name: getStringValue(formData, "name"),
    description: getStringValue(formData, "description"),
    category: getStringValue(formData, "category"),
    tagsInput: getStringValue(formData, "tagsInput"),
    joinType: getStringValue(formData, "joinType"),
  });

  if (!parsed.success) {
    redirectWithError(
      editPath,
      parsed.error.issues[0]?.message ?? "Invalid community input.",
    );
  }

  const user = await requireUser();
  const avatarFile = getOptionalFile(formData, "avatar");

  if (avatarFile) {
    const imageMetaError = validateImageFileMeta(avatarFile, AVATAR_MAX_SIZE_BYTES);
    if (imageMetaError) {
      redirectWithError(editPath, imageMetaError);
    }

    const hasValidSignature = await hasValidImageSignature(avatarFile);
    if (!hasValidSignature) {
      redirectWithError(editPath, "Invalid image content. Upload JPEG, PNG, or WEBP files only.");
    }
  }

  const updateRateResult = consumeRateLimit(`connect:update-community:${user.id}`, COMMUNITY_UPDATE_LIMIT);

  if (!updateRateResult.allowed) {
    logSecurityEvent("community_update_rate_limited", {
      ...requestContext,
      userId: user.id,
      communityId,
      retryAfterMs: updateRateResult.retryAfterMs,
    });
    redirectWithError(editPath, "Too many update attempts. Please wait and try again.");
  }

  const supabase = await createClient();
  const ownedCommunity = await verifyCommunityOwnershipOrRedirect(
    supabase,
    communityId,
    user.id,
    editPath,
    requestContext,
  );

  let uploadedAvatarPath: string | null = null;
  if (avatarFile) {
    uploadedAvatarPath = `${user.id}/communities/${communityId}/${createMediaFilename("avatar", avatarFile)}`;
    if (!isSafeStoragePath(uploadedAvatarPath)) {
      redirectWithError(editPath, "Invalid community avatar path.");
    }
    const { error: avatarUploadError } = await supabase.storage
      .from(AVATARS_BUCKET)
      .upload(uploadedAvatarPath, avatarFile, {
        upsert: false,
        contentType: avatarFile.type,
      });

    if (avatarUploadError) {
      redirectWithError(editPath, "Failed to upload community avatar.");
    }
  }

  const { data: updated, error: updateError } = await supabase
    .from("communities")
    .update({
      name: parsed.data.name,
      description: parsed.data.description,
      category: parsed.data.category,
      tags: parsed.data.tagsInput,
      join_type: parsed.data.joinType,
      avatar_path: uploadedAvatarPath ?? ownedCommunity.avatar_path,
    })
    .eq("id", communityId)
    .eq("created_by", user.id)
    .select("id")
    .maybeSingle();

  if (updateError) {
    if (uploadedAvatarPath) {
      await removeStorageObjectBestEffort(supabase, AVATARS_BUCKET, uploadedAvatarPath);
    }
    logAppError(
      "connect",
      "community_update_failed",
      createAppError("DATABASE_ERROR", updateError.message, {
        safeMessage: mapUpdateCommunityErrorMessage(updateError.code),
        metadata: {
          code: updateError.code,
          userId: user.id,
          communityId,
        },
      }),
      requestContext,
    );
    redirectWithError(editPath, mapUpdateCommunityErrorMessage(updateError.code));
  }

  if (!updated) {
    if (uploadedAvatarPath) {
      await removeStorageObjectBestEffort(supabase, AVATARS_BUCKET, uploadedAvatarPath);
    }
    logWarn("connect", "community_update_missing_row", {
      ...requestContext,
      userId: user.id,
      communityId,
    });
    redirectWithError(editPath, "Community not found.");
  }

  if (uploadedAvatarPath && ownedCommunity.avatar_path && ownedCommunity.avatar_path !== uploadedAvatarPath) {
    await removeStorageObjectBestEffort(supabase, AVATARS_BUCKET, ownedCommunity.avatar_path);
  }

  revalidateCommunityPaths(communityId);
  logInfo("connect", "community_updated", {
    ...requestContext,
    userId: user.id,
    communityId,
  });
  redirectWithMessage(`/connect/communities/${communityId}`, "Community updated");
}

export async function deleteCommunityAction(formData: FormData) {
  const requestContext = await getRequestContext({ action: "deleteCommunityAction" });
  const parsed = communityMutationIdSchema.safeParse({
    communityId: getStringValue(formData, "communityId"),
  });

  if (!parsed.success) {
    redirectWithError("/connect/communities", parsed.error.issues[0]?.message ?? "Invalid community id.");
  }

  const communityId = parsed.data.communityId;
  const editPath = `/connect/communities/${communityId}/edit`;
  const user = await requireUser();
  const deleteRateResult = consumeRateLimit(`connect:delete-community:${user.id}`, COMMUNITY_DELETE_LIMIT);

  if (!deleteRateResult.allowed) {
    logSecurityEvent("community_delete_rate_limited", {
      ...requestContext,
      userId: user.id,
      communityId,
      retryAfterMs: deleteRateResult.retryAfterMs,
    });
    redirectWithError(editPath, "Too many delete attempts. Please wait and try again.");
  }

  const supabase = await createClient();
  const ownedCommunity = await verifyCommunityOwnershipOrRedirect(
    supabase,
    communityId,
    user.id,
    editPath,
    requestContext,
  );

  const { data: deleted, error: deleteError } = await supabase
    .from("communities")
    .delete()
    .eq("id", communityId)
    .eq("created_by", user.id)
    .select("id")
    .maybeSingle();

  if (deleteError) {
    logAppError(
      "connect",
      "community_delete_failed",
      createAppError("DATABASE_ERROR", deleteError.message, {
        safeMessage: mapDeleteCommunityErrorMessage(deleteError.code),
        metadata: {
          code: deleteError.code,
          userId: user.id,
          communityId,
        },
      }),
      requestContext,
    );
    redirectWithError(editPath, mapDeleteCommunityErrorMessage(deleteError.code));
  }

  if (!deleted) {
    logWarn("connect", "community_delete_missing_row", {
      ...requestContext,
      userId: user.id,
      communityId,
    });
    redirectWithError(editPath, "Community not found.");
  }

  await removeStorageObjectBestEffort(supabase, AVATARS_BUCKET, ownedCommunity.avatar_path);

  revalidateCommunityPaths(communityId);
  logInfo("connect", "community_deleted", {
    ...requestContext,
    userId: user.id,
    communityId,
  });
  redirectWithMessage("/connect/my-communities", "Community deleted");
}

export async function joinOrRequestCommunityAction(formData: FormData) {
  const parsed = communityJoinSchema.safeParse({
    communityId: getStringValue(formData, "communityId"),
    redirectTo: getStringValue(formData, "redirectTo"),
  });

  if (!parsed.success) {
    redirectWithError("/connect/communities", parsed.error.issues[0]?.message ?? "Invalid community request.");
  }

  const user = await requireUser();
  const joinRateResult = consumeRateLimit(`connect:join-community:${user.id}`, COMMUNITY_JOIN_LIMIT);

  if (!joinRateResult.allowed) {
    redirectWithError("/connect/communities", "Too many join requests. Please wait and try again.");
  }

  const supabase = await createClient();

  const { data: community, error: communityError } = await supabase
    .from("communities")
    .select("id, created_by, join_type, name")
    .eq("id", parsed.data.communityId)
    .maybeSingle();

  if (communityError || !community) {
    redirectWithError("/connect/communities", "Community not found.");
  }

  if (community.created_by === user.id) {
    const fallback = `/connect/communities/${community.id}`;
    const redirectPath = sanitizeInternalPath(parsed.data.redirectTo, fallback);
    redirectWithMessage(redirectPath, "You manage this community.");
  }

  const targetStatus = community.join_type === "open" ? "joined" : "pending";

  const { data: existingMembership, error: membershipError } = await supabase
    .from("community_members")
    .select("status")
    .eq("community_id", community.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError) {
    redirectWithError("/connect/communities", "Failed to check membership status.");
  }

  if (existingMembership) {
    const fallback = `/connect/communities/${community.id}`;
    const redirectPath = sanitizeInternalPath(parsed.data.redirectTo, fallback);
    const existingMessage =
      existingMembership.status === "joined"
        ? "You are already in this community."
        : existingMembership.status === "pending"
          ? "Your join request is already pending."
          : existingMembership.status === "rejected"
            ? "Your previous request was rejected."
            : "You left this community and cannot rejoin yet.";

    redirectWithMessage(redirectPath, existingMessage);
  }

  const { error: insertError } = await supabase.from("community_members").insert(
    {
      community_id: community.id,
      user_id: user.id,
      role: "member",
      status: targetStatus,
    },
  );

  if (insertError?.code === "23505") {
    const fallback = `/connect/communities/${community.id}`;
    const redirectPath = sanitizeInternalPath(parsed.data.redirectTo, fallback);
    const duplicateMessage =
      targetStatus === "joined"
        ? "You are already in this community."
        : "Your join request is already pending.";

    redirectWithMessage(redirectPath, duplicateMessage);
  }

  if (insertError) {
    redirectWithError("/connect/communities", "Failed to submit community request.");
  }

  if (targetStatus === "pending") {
    await writeInAppNotification(supabase, {
      userId: community.created_by,
      type: "community",
      title: "New community join request",
      message: `A student requested to join ${community.name}.`,
      link: "/connect/communities/requests",
      payload: {
        kind: "community_join_request_submitted",
        community_id: community.id,
        requester_user_id: user.id,
      },
    });
  }

  revalidatePath("/connect");
  revalidatePath("/connect/communities");
  revalidatePath("/connect/my-communities");
  revalidatePath("/connect/communities/requests");
  revalidatePath("/profile/notifications");
  revalidatePath(`/connect/communities/${community.id}`);

  const fallback = `/connect/communities/${community.id}`;
  const redirectPath = sanitizeInternalPath(parsed.data.redirectTo, fallback);
  const successMessage = targetStatus === "joined" ? "Joined community." : "Request submitted.";

  redirectWithMessage(redirectPath, successMessage);
}

export async function reviewCommunityRequestAction(formData: FormData) {
  const parsed = communityRequestReviewSchema.safeParse({
    communityId: getStringValue(formData, "communityId"),
    userId: getStringValue(formData, "userId"),
    decision: getStringValue(formData, "decision"),
    redirectTo: getStringValue(formData, "redirectTo"),
  });

  if (!parsed.success) {
    redirectWithError("/connect/communities/requests", parsed.error.issues[0]?.message ?? "Invalid request review.");
  }

  const user = await requireUser();
  const reviewRateResult = consumeRateLimit(`connect:review-community:${user.id}`, COMMUNITY_REVIEW_LIMIT);

  if (!reviewRateResult.allowed) {
    redirectWithError("/connect/communities/requests", "Too many review actions. Please wait and try again.");
  }

  const supabase = await createClient();

  const { data: community, error: communityError } = await supabase
    .from("communities")
    .select("id, created_by, name")
    .eq("id", parsed.data.communityId)
    .maybeSingle();

  if (communityError || !community || community.created_by !== user.id) {
    redirectWithError("/connect/communities/requests", "You cannot review requests for this community.");
  }

  const { data: existingRequest, error: existingRequestError } = await supabase
    .from("community_members")
    .select("status")
    .eq("community_id", parsed.data.communityId)
    .eq("user_id", parsed.data.userId)
    .maybeSingle();

  if (existingRequestError) {
    redirectWithError("/connect/communities/requests", "Failed to load request.");
  }

  if (!existingRequest || existingRequest.status !== "pending") {
    redirectWithError("/connect/communities/requests", "Request is no longer pending.");
  }

  const nextStatus = parsed.data.decision === "approve" ? "joined" : "rejected";

  const { error: updateError } = await supabase
    .from("community_members")
    .update({ status: nextStatus })
    .eq("community_id", parsed.data.communityId)
    .eq("user_id", parsed.data.userId)
    .eq("status", "pending");

  if (updateError) {
    redirectWithError("/connect/communities/requests", "Failed to update request status.");
  }

  await writeInAppNotification(supabase, {
    userId: parsed.data.userId,
    type: "community",
    title:
      parsed.data.decision === "approve"
        ? "Community request approved"
        : "Community request rejected",
    message:
      parsed.data.decision === "approve"
        ? `Your request to join ${community.name} was approved.`
        : `Your request to join ${community.name} was rejected.`,
    link:
      parsed.data.decision === "approve"
        ? "/connect/my-communities?view=joined"
        : "/connect/my-communities?view=pending",
    payload: {
      kind: "community_request_reviewed",
      community_id: community.id,
      decision: parsed.data.decision,
      reviewer_user_id: user.id,
    },
  });

  revalidatePath("/connect");
  revalidatePath("/connect/communities");
  revalidatePath("/connect/communities/requests");
  revalidatePath("/connect/my-communities");
  revalidatePath("/profile/notifications");
  revalidatePath(`/connect/communities/${parsed.data.communityId}`);

  const fallback = "/connect/communities/requests";
  const redirectPath = sanitizeInternalPath(parsed.data.redirectTo, fallback);
  const successMessage = parsed.data.decision === "approve" ? "Request approved." : "Request rejected.";

  redirectWithMessage(redirectPath, successMessage);
}

export async function setCommunityFormalKindAction(formData: FormData) {
  const requestContext = await getRequestContext({ action: "setCommunityFormalKindAction" });
  const parsed = setCommunityFormalKindSchema.safeParse({
    communityId: getStringValue(formData, "communityId"),
    formalKind: getStringValue(formData, "formalKind"),
    redirectTo: getStringValue(formData, "redirectTo"),
  });

  if (!parsed.success) {
    redirectWithError("/profile/moderation", parsed.error.issues[0]?.message ?? "Invalid curation input.");
  }

  const redirectPath = sanitizeInternalPath(parsed.data.redirectTo, "/profile/moderation");
  const user = await requireUser();

  if (!isAdminUser(user)) {
    logSecurityEvent("community_formal_curation_admin_violation", {
      ...requestContext,
      userId: user.id,
      communityId: parsed.data.communityId,
      formalKind: parsed.data.formalKind,
    });
    redirectWithError(redirectPath, "Not authorized.");
  }

  const supabase = await createClient();
  const { data: updated, error: updateError } = await supabase
    .from("communities")
    .update({
      community_type: "formal",
      formal_kind: parsed.data.formalKind,
    })
    .eq("id", parsed.data.communityId)
    .select("id")
    .maybeSingle();

  if (updateError) {
    redirectWithError(redirectPath, mapCommunityCurationErrorMessage(updateError.code));
  }

  if (!updated) {
    redirectWithError(redirectPath, "Community not found.");
  }

  revalidateCommunityCurationPaths(parsed.data.communityId);
  logInfo("connect", "community_formal_kind_set", {
    ...requestContext,
    userId: user.id,
    communityId: parsed.data.communityId,
    formalKind: parsed.data.formalKind,
  });
  redirectWithMessage(
    redirectPath,
    `Community trust label set to ${formatFormalKindLabel(parsed.data.formalKind)}.`,
  );
}

export async function clearCommunityFormalStatusAction(formData: FormData) {
  const requestContext = await getRequestContext({ action: "clearCommunityFormalStatusAction" });
  const parsed = clearCommunityFormalStatusSchema.safeParse({
    communityId: getStringValue(formData, "communityId"),
    redirectTo: getStringValue(formData, "redirectTo"),
  });

  if (!parsed.success) {
    redirectWithError("/profile/moderation", parsed.error.issues[0]?.message ?? "Invalid curation input.");
  }

  const redirectPath = sanitizeInternalPath(parsed.data.redirectTo, "/profile/moderation");
  const user = await requireUser();

  if (!isAdminUser(user)) {
    logSecurityEvent("community_formal_curation_admin_violation", {
      ...requestContext,
      userId: user.id,
      communityId: parsed.data.communityId,
      formalKind: null,
    });
    redirectWithError(redirectPath, "Not authorized.");
  }

  const supabase = await createClient();
  const { data: updated, error: updateError } = await supabase
    .from("communities")
    .update({
      community_type: "informal",
      formal_kind: null,
    })
    .eq("id", parsed.data.communityId)
    .select("id")
    .maybeSingle();

  if (updateError) {
    redirectWithError(redirectPath, mapCommunityCurationErrorMessage(updateError.code));
  }

  if (!updated) {
    redirectWithError(redirectPath, "Community not found.");
  }

  revalidateCommunityCurationPaths(parsed.data.communityId);
  logInfo("connect", "community_formal_status_cleared", {
    ...requestContext,
    userId: user.id,
    communityId: parsed.data.communityId,
  });
  redirectWithMessage(redirectPath, "Community trust label cleared.");
}

export async function sendFriendRequestAction(formData: FormData) {
  const parsed = sendFriendRequestSchema.safeParse({
    addresseeId: getStringValue(formData, "addresseeId"),
    redirectTo: getStringValue(formData, "redirectTo"),
  });

  if (!parsed.success) {
    redirectWithError("/connect/people", parsed.error.issues[0]?.message ?? "Invalid friend request input.");
  }

  const fallbackPath = `/connect/people/${parsed.data.addresseeId}`;
  const redirectPath = sanitizeInternalPath(parsed.data.redirectTo, fallbackPath);
  const user = await requireUser();

  if (parsed.data.addresseeId === user.id) {
    logSecurityEvent("friend_request_self_blocked", {
      userId: user.id,
      targetUserId: parsed.data.addresseeId,
    });
    redirectWithError(redirectPath, "You cannot send a friend request to yourself.");
  }

  const sendRateResult = consumeRateLimit(`connect:friend-request:send:${user.id}`, FRIEND_REQUEST_SEND_LIMIT);
  if (!sendRateResult.allowed) {
    redirectWithError(redirectPath, "Too many friend requests. Please wait and try again.");
  }

  const supabase = await createClient();
  const { data: targetProfile, error: targetProfileError } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("user_id", parsed.data.addresseeId)
    .maybeSingle();

  if (targetProfileError || !targetProfile) {
    redirectWithError("/connect/people", "Student not found.");
  }

  let existingFriendship: { id: string; requester_id: string; addressee_id: string; status: "pending" | "accepted" | "rejected"; } | null = null;
  try {
    existingFriendship = await getFriendshipBetweenUsers(supabase, user.id, parsed.data.addresseeId);
  } catch {
    redirectWithError(redirectPath, "Failed to check existing friend request.");
  }

  if (existingFriendship?.status === "accepted") {
    redirectWithMessage(redirectPath, "You are already friends.");
  }

  if (existingFriendship?.status === "pending") {
    if (existingFriendship.requester_id === user.id) {
      redirectWithMessage(redirectPath, "Friend request already sent.");
    }

    redirectWithMessage(redirectPath, "This student already sent you a friend request.");
  }

  if (existingFriendship?.status === "rejected") {
    const { error: reviveError } = await supabase
      .from("friendships")
      .update({
        requester_id: user.id,
        addressee_id: parsed.data.addresseeId,
        status: "pending",
      })
      .eq("id", existingFriendship.id);

    if (reviveError) {
      redirectWithError(redirectPath, mapFriendRequestErrorMessage(reviveError.code));
    }

    revalidateFriendPaths(user.id, parsed.data.addresseeId);
    redirectWithMessage(redirectPath, "Friend request sent.");
  }

  const { error: insertError } = await supabase.from("friendships").insert({
    requester_id: user.id,
    addressee_id: parsed.data.addresseeId,
    status: "pending",
  });

  if (insertError) {
    if (insertError.code === "23505") {
      redirectWithMessage(redirectPath, "Friend request already exists for this student.");
    }

    redirectWithError(redirectPath, mapFriendRequestErrorMessage(insertError.code));
  }

  revalidateFriendPaths(user.id, parsed.data.addresseeId);
  redirectWithMessage(redirectPath, "Friend request sent.");
}

export async function acceptFriendRequestAction(formData: FormData) {
  const parsed = acceptFriendRequestSchema.safeParse({
    friendshipId: getStringValue(formData, "friendshipId"),
    redirectTo: getStringValue(formData, "redirectTo"),
  });

  if (!parsed.success) {
    redirectWithError("/connect/friends", parsed.error.issues[0]?.message ?? "Invalid friend request.");
  }

  const redirectPath = sanitizeInternalPath(parsed.data.redirectTo, "/connect/friends");
  const user = await requireUser();
  const reviewRateResult = consumeRateLimit(`connect:friend-request:review:${user.id}`, FRIEND_REQUEST_REVIEW_LIMIT);

  if (!reviewRateResult.allowed) {
    redirectWithError(redirectPath, "Too many request actions. Please wait and try again.");
  }

  const supabase = await createClient();
  const { data: friendship, error: friendshipError } = await supabase
    .from("friendships")
    .select("id, requester_id, addressee_id, status")
    .eq("id", parsed.data.friendshipId)
    .maybeSingle();

  if (friendshipError) {
    redirectWithError(redirectPath, "Failed to load friend request.");
  }

  if (!friendship) {
    redirectWithError(redirectPath, "Friend request not found.");
  }

  if (friendship.addressee_id !== user.id) {
    redirectWithError(redirectPath, "You can only review incoming friend requests.");
  }

  if (friendship.status !== "pending") {
    redirectWithMessage(redirectPath, "This request is no longer pending.");
  }

  const { data: updated, error: updateError } = await supabase
    .from("friendships")
    .update({ status: "accepted" })
    .eq("id", friendship.id)
    .eq("addressee_id", user.id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (updateError) {
    redirectWithError(redirectPath, mapFriendRequestErrorMessage(updateError.code));
  }

  if (!updated) {
    redirectWithMessage(redirectPath, "This request is no longer pending.");
  }

  revalidateFriendPaths(user.id, friendship.requester_id);
  redirectWithMessage(redirectPath, "Friend request accepted.");
}

export async function rejectFriendRequestAction(formData: FormData) {
  const parsed = rejectFriendRequestSchema.safeParse({
    friendshipId: getStringValue(formData, "friendshipId"),
    redirectTo: getStringValue(formData, "redirectTo"),
  });

  if (!parsed.success) {
    redirectWithError("/connect/friends", parsed.error.issues[0]?.message ?? "Invalid friend request.");
  }

  const redirectPath = sanitizeInternalPath(parsed.data.redirectTo, "/connect/friends");
  const user = await requireUser();
  const reviewRateResult = consumeRateLimit(`connect:friend-request:review:${user.id}`, FRIEND_REQUEST_REVIEW_LIMIT);

  if (!reviewRateResult.allowed) {
    redirectWithError(redirectPath, "Too many request actions. Please wait and try again.");
  }

  const supabase = await createClient();
  const { data: friendship, error: friendshipError } = await supabase
    .from("friendships")
    .select("id, requester_id, addressee_id, status")
    .eq("id", parsed.data.friendshipId)
    .maybeSingle();

  if (friendshipError) {
    redirectWithError(redirectPath, "Failed to load friend request.");
  }

  if (!friendship) {
    redirectWithError(redirectPath, "Friend request not found.");
  }

  if (friendship.addressee_id !== user.id) {
    redirectWithError(redirectPath, "You can only review incoming friend requests.");
  }

  if (friendship.status !== "pending") {
    redirectWithMessage(redirectPath, "This request is no longer pending.");
  }

  const { data: updated, error: updateError } = await supabase
    .from("friendships")
    .update({ status: "rejected" })
    .eq("id", friendship.id)
    .eq("addressee_id", user.id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (updateError) {
    redirectWithError(redirectPath, mapFriendRequestErrorMessage(updateError.code));
  }

  if (!updated) {
    redirectWithMessage(redirectPath, "This request is no longer pending.");
  }

  revalidateFriendPaths(user.id, friendship.requester_id);
  redirectWithMessage(redirectPath, "Friend request rejected.");
}

export async function cancelFriendRequestAction(formData: FormData) {
  const parsed = cancelFriendRequestSchema.safeParse({
    friendshipId: getStringValue(formData, "friendshipId"),
    redirectTo: getStringValue(formData, "redirectTo"),
  });

  if (!parsed.success) {
    redirectWithError("/connect/friends", parsed.error.issues[0]?.message ?? "Invalid friend request.");
  }

  const redirectPath = sanitizeInternalPath(parsed.data.redirectTo, "/connect/friends");
  const user = await requireUser();
  const reviewRateResult = consumeRateLimit(`connect:friend-request:review:${user.id}`, FRIEND_REQUEST_REVIEW_LIMIT);

  if (!reviewRateResult.allowed) {
    redirectWithError(redirectPath, "Too many request actions. Please wait and try again.");
  }

  const supabase = await createClient();
  const { data: friendship, error: friendshipError } = await supabase
    .from("friendships")
    .select("id, requester_id, addressee_id, status")
    .eq("id", parsed.data.friendshipId)
    .maybeSingle();

  if (friendshipError) {
    redirectWithError(redirectPath, "Failed to load friend request.");
  }

  if (!friendship) {
    redirectWithError(redirectPath, "Friend request not found.");
  }

  if (friendship.requester_id !== user.id) {
    redirectWithError(redirectPath, "You can only cancel requests you sent.");
  }

  if (friendship.status !== "pending") {
    redirectWithMessage(redirectPath, "This request is no longer pending.");
  }

  const { data: deleted, error: deleteError } = await supabase
    .from("friendships")
    .delete()
    .eq("id", friendship.id)
    .eq("requester_id", user.id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (deleteError) {
    redirectWithError(redirectPath, mapFriendRequestErrorMessage(deleteError.code));
  }

  if (!deleted) {
    redirectWithMessage(redirectPath, "This request is no longer pending.");
  }

  revalidateFriendPaths(user.id, friendship.addressee_id);
  redirectWithMessage(redirectPath, "Friend request canceled.");
}

export async function startFriendConversationAction(formData: FormData) {
  const requestContext = await getRequestContext({ action: "startFriendConversationAction" });
  const parsed = startFriendConversationSchema.safeParse({
    friendId: getStringValue(formData, "friendId"),
    redirectTo: getStringValue(formData, "redirectTo"),
  });

  if (!parsed.success) {
    redirectWithError("/connect/people", parsed.error.issues[0]?.message ?? "Invalid conversation input.");
  }

  const fallbackPath = `/connect/people/${parsed.data.friendId}`;
  const redirectPath = sanitizeInternalPath(parsed.data.redirectTo, fallbackPath);
  const user = await requireUser();

  if (parsed.data.friendId === user.id) {
    redirectWithError(redirectPath, "You cannot message yourself.");
  }

  const requestId = getRequestIdFromContext(requestContext);
  const burstRateResult = await consumeDistributedRateLimit(
    `connect:friend-conversation:start:burst:${user.id}:${parsed.data.friendId}`,
    FRIEND_CONVERSATION_START_BURST_LIMIT,
    {
      action: "startFriendConversationAction",
      userId: user.id,
      targetId: parsed.data.friendId,
      requestId,
    },
  );
  const rateResult = await consumeDistributedRateLimit(
    `connect:friend-conversation:start:${user.id}`,
    FRIEND_CONVERSATION_START_LIMIT,
    {
      action: "startFriendConversationAction",
      userId: user.id,
      targetId: parsed.data.friendId,
      requestId,
    },
  );
  if (!burstRateResult.allowed || !rateResult.allowed) {
    redirectWithError(redirectPath, "Too many conversation attempts. Please wait and try again.");
  }

  const supabase = await createClient();
  const { data: friendProfile, error: friendProfileError } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("user_id", parsed.data.friendId)
    .maybeSingle();

  if (friendProfileError || !friendProfile) {
    redirectWithError("/connect/people", "Student not found.");
  }

  let acceptedFriendship: {
    id: string;
    requester_id: string;
    addressee_id: string;
    status: "pending" | "accepted" | "rejected";
  } | null = null;

  try {
    acceptedFriendship = await getAcceptedFriendshipBetweenUsers(supabase, user.id, parsed.data.friendId);
  } catch {
    redirectWithError(redirectPath, "Failed to verify friendship.");
  }

  if (!acceptedFriendship) {
    redirectWithError(redirectPath, "Only accepted friends can start conversations.");
  }

  const userAId = user.id < parsed.data.friendId ? user.id : parsed.data.friendId;
  const userBId = user.id < parsed.data.friendId ? parsed.data.friendId : user.id;

  const { data: existingConversation, error: existingConversationError } = await supabase
    .from("friend_conversations")
    .select("id")
    .eq("user_a_id", userAId)
    .eq("user_b_id", userBId)
    .maybeSingle();

  if (existingConversationError) {
    redirectWithError(redirectPath, "Failed to load conversation.");
  }

  if (existingConversation) {
    redirect(`/connect/messages/${existingConversation.id}`);
  }

  const { data: createdConversation, error: createConversationError } = await supabase
    .from("friend_conversations")
    .insert({
      user_a_id: userAId,
      user_b_id: userBId,
    })
    .select("id")
    .maybeSingle();

  if (createConversationError?.code === "23505") {
    const { data: racedConversation, error: raceLookupError } = await supabase
      .from("friend_conversations")
      .select("id")
      .eq("user_a_id", userAId)
      .eq("user_b_id", userBId)
      .maybeSingle();

    if (raceLookupError || !racedConversation) {
      redirectWithError(redirectPath, "Failed to open conversation.");
    }

    revalidateFriendMessagingPaths(racedConversation.id);
    redirect(`/connect/messages/${racedConversation.id}`);
  }

  if (createConversationError || !createdConversation) {
    redirectWithError(redirectPath, mapFriendConversationErrorMessage(createConversationError?.code));
  }

  revalidateFriendMessagingPaths(createdConversation.id);
  redirect(`/connect/messages/${createdConversation.id}`);
}

export async function sendFriendMessageAction(formData: FormData) {
  const requestContext = await getRequestContext({
    action: "sendFriendMessageAction",
    route: "/connect/messages/[conversationId]",
  });
  const startedAt = performance.now();
  const parsed = sendFriendMessageSchema.safeParse({
    conversationId: getStringValue(formData, "conversationId"),
    content: getStringValue(formData, "content"),
    redirectTo: getStringValue(formData, "redirectTo"),
  });

  if (!parsed.success) {
    redirectWithError("/connect/messages", parsed.error.issues[0]?.message ?? "Invalid message input.");
  }

  const conversationPath = `/connect/messages/${parsed.data.conversationId}`;
  const redirectPath = sanitizeInternalPath(parsed.data.redirectTo, conversationPath);
  const user = await requireUser();
  const requestId = getRequestIdFromContext(requestContext);
  const burstRateResult = await consumeDistributedRateLimit(
    `connect:friend-message:send:burst:${user.id}:${parsed.data.conversationId}`,
    FRIEND_MESSAGE_SEND_BURST_LIMIT,
    {
      action: "sendFriendMessageAction",
      userId: user.id,
      targetId: parsed.data.conversationId,
      requestId,
    },
  );
  const rateResult = await consumeDistributedRateLimit(
    `connect:friend-message:send:${user.id}`,
    FRIEND_MESSAGE_SEND_LIMIT,
    {
      action: "sendFriendMessageAction",
      userId: user.id,
      targetId: parsed.data.conversationId,
      requestId,
    },
  );

  if (!burstRateResult.allowed || !rateResult.allowed) {
    logSecurityEvent("friend_message_send_rate_limited", {
      ...requestContext,
      action: "sendFriendMessageAction",
      userId: user.id,
      route: conversationPath,
      durationMs: getDurationMs(startedAt),
      outcome: "rate_limited",
      retryAfterMs: Math.max(burstRateResult.retryAfterMs, rateResult.retryAfterMs),
    });
    redirectWithError(redirectPath, "Too many messages. Please wait and try again.");
  }

  const supabase = await createClient();
  const { data: conversation, error: conversationError } = await supabase
    .from("friend_conversations")
    .select("id, user_a_id, user_b_id")
    .eq("id", parsed.data.conversationId)
    .maybeSingle();

  if (conversationError) {
    logWarn("connect", "friend_message_conversation_load_failed", {
      ...requestContext,
      action: "sendFriendMessageAction",
      userId: user.id,
      route: conversationPath,
      durationMs: getDurationMs(startedAt),
      outcome: "error",
      errorCode: conversationError.code ?? null,
    });
    redirectWithError(redirectPath, "Failed to load conversation.");
  }

  if (!conversation) {
    logWarn("connect", "friend_message_conversation_missing", {
      ...requestContext,
      action: "sendFriendMessageAction",
      userId: user.id,
      route: conversationPath,
      durationMs: getDurationMs(startedAt),
      outcome: "error",
    });
    redirectWithError("/connect/messages", "Conversation not found.");
  }

  const isParticipant = conversation.user_a_id === user.id || conversation.user_b_id === user.id;
  if (!isParticipant) {
    logSecurityEvent("friend_message_membership_violation", {
      ...requestContext,
      action: "sendFriendMessageAction",
      userId: user.id,
      route: conversationPath,
      durationMs: getDurationMs(startedAt),
      outcome: "error",
      conversationId: conversation.id,
    });
    redirectWithError("/connect/messages", "You cannot send messages in this conversation.");
  }

  let acceptedFriendship: {
    id: string;
    requester_id: string;
    addressee_id: string;
    status: "pending" | "accepted" | "rejected";
  } | null = null;

  try {
    acceptedFriendship = await getAcceptedFriendshipBetweenUsers(
      supabase,
      conversation.user_a_id,
      conversation.user_b_id,
    );
  } catch {
    logWarn("connect", "friend_message_friendship_verify_failed", {
      ...requestContext,
      action: "sendFriendMessageAction",
      userId: user.id,
      route: conversationPath,
      durationMs: getDurationMs(startedAt),
      outcome: "error",
      conversationId: conversation.id,
    });
    redirectWithError(redirectPath, "Failed to verify friendship.");
  }

  if (!acceptedFriendship) {
    logWarn("connect", "friend_message_friendship_missing", {
      ...requestContext,
      action: "sendFriendMessageAction",
      userId: user.id,
      route: conversationPath,
      durationMs: getDurationMs(startedAt),
      outcome: "error",
      conversationId: conversation.id,
    });
    redirectWithError(redirectPath, "Only accepted friends can message each other.");
  }

  const { error: insertMessageError } = await supabase
    .from("friend_messages")
    .insert({
      conversation_id: conversation.id,
      sender_id: user.id,
      content: parsed.data.content,
    });

  if (insertMessageError) {
    logWarn("connect", "friend_message_insert_failed", {
      ...requestContext,
      action: "sendFriendMessageAction",
      userId: user.id,
      route: conversationPath,
      durationMs: getDurationMs(startedAt),
      outcome: "error",
      conversationId: conversation.id,
      errorCode: insertMessageError.code ?? null,
    });
    redirectWithError(redirectPath, mapFriendMessageErrorMessage(insertMessageError.code));
  }

  const durationMs = getDurationMs(startedAt);
  const timingContext = {
    ...requestContext,
    action: "sendFriendMessageAction",
    userId: user.id,
    route: conversationPath,
    durationMs,
    outcome: "success",
    conversationId: conversation.id,
  };
  logInfo("connect", "friend_message_sent", timingContext);
  if (durationMs > ACTION_SLOW_THRESHOLD_MS) {
    logWarn("connect", "friend_message_send_slow", timingContext);
  }
  revalidateFriendMessagingPaths(conversation.id);
  if (redirectPath !== conversationPath) {
    redirect(redirectPath);
  }
}

export async function createCommunityPostAction(formData: FormData) {
  const requestContext = await getRequestContext({ action: "createCommunityPostAction" });
  const startedAt = performance.now();
  const parsed = createCommunityPostSchema.safeParse({
    communityId: getStringValue(formData, "communityId"),
    content: getStringValue(formData, "content"),
  });

  if (!parsed.success) {
    redirectWithError("/connect/communities", parsed.error.issues[0]?.message ?? "Invalid post input.");
  }

  const communityPath = `/connect/communities/${parsed.data.communityId}`;
  const user = await requireUser();
  const requestId = getRequestIdFromContext(requestContext);
  const burstRateResult = await consumeDistributedRateLimit(
    `connect:create-community-post:burst:${user.id}:${parsed.data.communityId}`,
    COMMUNITY_POST_CREATE_BURST_LIMIT,
    {
      action: "createCommunityPostAction",
      userId: user.id,
      targetId: parsed.data.communityId,
      requestId,
    },
  );
  const createRateResult = await consumeDistributedRateLimit(
    `connect:create-community-post:${user.id}:${parsed.data.communityId}`,
    COMMUNITY_POST_CREATE_LIMIT,
    {
      action: "createCommunityPostAction",
      userId: user.id,
      targetId: parsed.data.communityId,
      requestId,
    },
  );

  if (!burstRateResult.allowed || !createRateResult.allowed) {
    logSecurityEvent("community_post_create_rate_limited", {
      ...requestContext,
      action: "createCommunityPostAction",
      userId: user.id,
      route: communityPath,
      durationMs: getDurationMs(startedAt),
      outcome: "rate_limited",
      communityId: parsed.data.communityId,
      retryAfterMs: Math.max(burstRateResult.retryAfterMs, createRateResult.retryAfterMs),
    });
    redirectWithError(communityPath, "Too many post attempts. Please wait and try again.");
  }

  const supabase = await createClient();
  const { data: community, error: communityError } = await supabase
    .from("communities")
    .select("id, created_by, name")
    .eq("id", parsed.data.communityId)
    .maybeSingle();

  if (communityError || !community) {
    redirectWithError(communityPath, "Community not found.");
  }

  const { data: membership, error: membershipError } = await supabase
    .from("community_members")
    .select("status")
    .eq("community_id", parsed.data.communityId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError) {
    redirectWithError(communityPath, "Failed to verify community membership.");
  }

  if (membership?.status !== "joined") {
    logSecurityEvent("community_post_create_membership_violation", {
      ...requestContext,
      action: "createCommunityPostAction",
      userId: user.id,
      route: communityPath,
      durationMs: getDurationMs(startedAt),
      outcome: "error",
      communityId: parsed.data.communityId,
      membershipStatus: membership?.status ?? null,
    });
    redirectWithError(communityPath, "Join this community to post updates.");
  }

  const { data: createdPost, error: insertError } = await supabase
    .from("community_posts")
    .insert({
      community_id: parsed.data.communityId,
      author_id: user.id,
      content: parsed.data.content,
    })
    .select("id")
    .maybeSingle();

  if (insertError || !createdPost) {
    logAppError(
      "connect",
      "community_post_create_failed",
      createAppError("DATABASE_ERROR", insertError?.message ?? "Community post insert returned empty response.", {
        safeMessage: mapCreateCommunityPostErrorMessage(insertError?.code),
        metadata: {
          code: insertError?.code ?? null,
          action: "createCommunityPostAction",
          userId: user.id,
          route: communityPath,
          durationMs: getDurationMs(startedAt),
          outcome: "error",
          communityId: parsed.data.communityId,
        },
      }),
      {
        ...requestContext,
        action: "createCommunityPostAction",
        userId: user.id,
        route: communityPath,
        durationMs: getDurationMs(startedAt),
        outcome: "error",
        communityId: parsed.data.communityId,
      },
    );
    redirectWithError(communityPath, mapCreateCommunityPostErrorMessage(insertError?.code));
  }

  if (community.created_by !== user.id) {
    await writeInAppNotification(supabase, {
      userId: community.created_by,
      type: "community",
      title: "New post in your community",
      message: `Someone posted in ${community.name}.`,
      link: communityPath,
      payload: {
        kind: "community_post_created",
        community_id: community.id,
        post_id: createdPost.id,
      },
    });
  }

  revalidatePath(communityPath);
  revalidatePath("/profile/notifications");
  const durationMs = getDurationMs(startedAt);
  const timingContext = {
    ...requestContext,
    action: "createCommunityPostAction",
    userId: user.id,
    route: communityPath,
    durationMs,
    outcome: "success",
    communityId: parsed.data.communityId,
    postId: createdPost.id,
  };
  logInfo("connect", "community_post_created", {
    ...timingContext,
  });
  if (durationMs > ACTION_SLOW_THRESHOLD_MS) {
    logWarn("connect", "community_post_create_slow", timingContext);
  }
  redirectWithMessage(communityPath, "Post published.");
}

export async function deleteCommunityPostAction(formData: FormData) {
  const requestContext = await getRequestContext({ action: "deleteCommunityPostAction" });
  const parsed = deleteCommunityPostSchema.safeParse({
    communityId: getStringValue(formData, "communityId"),
    postId: getStringValue(formData, "postId"),
  });

  if (!parsed.success) {
    redirectWithError("/connect/communities", parsed.error.issues[0]?.message ?? "Invalid post id.");
  }

  const communityPath = `/connect/communities/${parsed.data.communityId}`;
  const user = await requireUser();
  const deleteRateResult = consumeRateLimit(
    `connect:delete-community-post:${user.id}:${parsed.data.communityId}`,
    COMMUNITY_POST_DELETE_LIMIT,
  );

  if (!deleteRateResult.allowed) {
    logSecurityEvent("community_post_delete_rate_limited", {
      ...requestContext,
      userId: user.id,
      communityId: parsed.data.communityId,
      postId: parsed.data.postId,
      retryAfterMs: deleteRateResult.retryAfterMs,
    });
    redirectWithError(communityPath, "Too many delete attempts. Please wait and try again.");
  }

  const supabase = await createClient();
  const { data: post, error: postError } = await supabase
    .from("community_posts")
    .select("id, author_id, community_id, community:communities!community_posts_community_id_fkey(created_by)")
    .eq("id", parsed.data.postId)
    .eq("community_id", parsed.data.communityId)
    .maybeSingle();

  if (postError) {
    redirectWithError(communityPath, "Failed to load post.");
  }

  if (!post) {
    redirectWithError(communityPath, "Post not found.");
  }

  const communityRelation = Array.isArray(post.community) ? post.community[0] : post.community;
  const isPostCommunityOwner = communityRelation?.created_by === user.id;
  const isAuthor = post.author_id === user.id;

  if (!isAuthor && !isPostCommunityOwner) {
    logSecurityEvent("community_post_delete_ownership_violation", {
      ...requestContext,
      userId: user.id,
      communityId: parsed.data.communityId,
      postId: parsed.data.postId,
      authorId: post.author_id,
      ownerId: communityRelation?.created_by ?? null,
    });
    redirectWithError(communityPath, "You can only delete your own posts.");
  }

  const { data: deletedPost, error: deleteError } = await supabase
    .from("community_posts")
    .delete()
    .eq("id", parsed.data.postId)
    .eq("community_id", parsed.data.communityId)
    .select("id")
    .maybeSingle();

  if (deleteError) {
    logAppError(
      "connect",
      "community_post_delete_failed",
      createAppError("DATABASE_ERROR", deleteError.message, {
        safeMessage: mapDeleteCommunityPostErrorMessage(deleteError.code),
        metadata: {
          code: deleteError.code,
          userId: user.id,
          communityId: parsed.data.communityId,
          postId: parsed.data.postId,
        },
      }),
      requestContext,
    );
    redirectWithError(communityPath, mapDeleteCommunityPostErrorMessage(deleteError.code));
  }

  if (!deletedPost) {
    logWarn("connect", "community_post_delete_missing_row", {
      ...requestContext,
      userId: user.id,
      communityId: parsed.data.communityId,
      postId: parsed.data.postId,
    });
    redirectWithError(communityPath, "Post not found.");
  }

  revalidatePath(communityPath);
  logInfo("connect", "community_post_deleted", {
    ...requestContext,
    userId: user.id,
    communityId: parsed.data.communityId,
    postId: parsed.data.postId,
  });
  redirectWithMessage(communityPath, "Post deleted.");
}
