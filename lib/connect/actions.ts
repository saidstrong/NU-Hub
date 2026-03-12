"use server";

import { revalidatePath } from "next/cache";
import {
  getStringValue,
  redirectWithError,
  redirectWithMessage,
  sanitizeInternalPath,
} from "@/lib/actions/helpers";
import { requireUser } from "@/lib/auth/session";
import { isCommunityOwner } from "@/lib/connect/ownership";
import { createAppError } from "@/lib/observability/errors";
import { logAppError, logInfo, logSecurityEvent, logWarn } from "@/lib/observability/logger";
import { getRequestContext } from "@/lib/observability/request-context";
import { writeInAppNotification } from "@/lib/notifications/write";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { createClient } from "@/lib/supabase/server";
import {
  communityMutationIdSchema,
  createCommunitySchema,
  communityJoinSchema,
  communityRequestReviewSchema,
  createCommunityPostSchema,
  deleteCommunityPostSchema,
  updateCommunitySchema,
} from "@/lib/validation/connect";
import {
  AVATAR_MAX_SIZE_BYTES,
  createMediaFilename,
  hasValidImageSignature,
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

const COMMUNITY_POST_DELETE_LIMIT = {
  maxHits: 30,
  windowMs: 10 * 60 * 1000,
};

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

export async function createCommunityPostAction(formData: FormData) {
  const requestContext = await getRequestContext({ action: "createCommunityPostAction" });
  const parsed = createCommunityPostSchema.safeParse({
    communityId: getStringValue(formData, "communityId"),
    content: getStringValue(formData, "content"),
  });

  if (!parsed.success) {
    redirectWithError("/connect/communities", parsed.error.issues[0]?.message ?? "Invalid post input.");
  }

  const communityPath = `/connect/communities/${parsed.data.communityId}`;
  const user = await requireUser();
  const createRateResult = consumeRateLimit(
    `connect:create-community-post:${user.id}:${parsed.data.communityId}`,
    COMMUNITY_POST_CREATE_LIMIT,
  );

  if (!createRateResult.allowed) {
    logSecurityEvent("community_post_create_rate_limited", {
      ...requestContext,
      userId: user.id,
      communityId: parsed.data.communityId,
      retryAfterMs: createRateResult.retryAfterMs,
    });
    redirectWithError(communityPath, "Too many post attempts. Please wait and try again.");
  }

  const supabase = await createClient();
  const { data: community, error: communityError } = await supabase
    .from("communities")
    .select("id")
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
      userId: user.id,
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
          userId: user.id,
          communityId: parsed.data.communityId,
        },
      }),
      requestContext,
    );
    redirectWithError(communityPath, mapCreateCommunityPostErrorMessage(insertError?.code));
  }

  revalidatePath(communityPath);
  logInfo("connect", "community_post_created", {
    ...requestContext,
    userId: user.id,
    communityId: parsed.data.communityId,
    postId: createdPost.id,
  });
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
