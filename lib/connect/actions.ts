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
import { writeInAppNotification } from "@/lib/notifications/write";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { createClient } from "@/lib/supabase/server";
import {
  communityMutationIdSchema,
  createCommunitySchema,
  communityJoinSchema,
  communityRequestReviewSchema,
  updateCommunitySchema,
} from "@/lib/validation/connect";

async function deleteCommunityOnCreateFailure(
  supabase: Awaited<ReturnType<typeof createClient>>,
  communityId: string,
) {
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

async function verifyCommunityOwnershipOrRedirect(
  supabase: SupabaseServerClient,
  communityId: string,
  userId: string,
  onErrorPath: string,
) {
  const { data: community, error } = await supabase
    .from("communities")
    .select("id, created_by")
    .eq("id", communityId)
    .maybeSingle();

  if (error) {
    redirectWithError(onErrorPath, "Failed to load community.");
  }

  if (!community) {
    redirectWithError(onErrorPath, "Community not found.");
  }

  if (!isCommunityOwner(community.created_by, userId)) {
    redirectWithError(onErrorPath, "You can only manage your own community.");
  }
}

export async function createCommunityAction(formData: FormData) {
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
  const burstRateResult = consumeRateLimit(
    `connect:create-community:burst:${user.id}`,
    CREATE_COMMUNITY_BURST_LIMIT,
  );
  const windowRateResult = consumeRateLimit(
    `connect:create-community:window:${user.id}`,
    CREATE_COMMUNITY_WINDOW_LIMIT,
  );

  if (!burstRateResult.allowed || !windowRateResult.allowed) {
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
    redirectWithError("/connect/communities/create", "Failed to create community.");
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
    await deleteCommunityOnCreateFailure(supabase, community.id);
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
    await deleteCommunityOnCreateFailure(supabase, community.id);
    redirectWithError("/connect/communities/create", "Failed to finalize community owner access.");
  }

  revalidatePath("/connect");
  revalidatePath("/connect/communities");
  revalidatePath("/connect/my-communities");
  revalidatePath(`/connect/communities/${community.id}`);

  redirectWithMessage(`/connect/communities/${community.id}`, "Community created.");
}

export async function updateCommunityAction(formData: FormData) {
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
  const updateRateResult = consumeRateLimit(`connect:update-community:${user.id}`, COMMUNITY_UPDATE_LIMIT);

  if (!updateRateResult.allowed) {
    redirectWithError(editPath, "Too many update attempts. Please wait and try again.");
  }

  const supabase = await createClient();
  await verifyCommunityOwnershipOrRedirect(supabase, communityId, user.id, editPath);

  const { data: updated, error: updateError } = await supabase
    .from("communities")
    .update({
      name: parsed.data.name,
      description: parsed.data.description,
      category: parsed.data.category,
      tags: parsed.data.tagsInput,
      join_type: parsed.data.joinType,
    })
    .eq("id", communityId)
    .eq("created_by", user.id)
    .select("id")
    .maybeSingle();

  if (updateError) {
    redirectWithError(editPath, mapUpdateCommunityErrorMessage(updateError.code));
  }

  if (!updated) {
    redirectWithError(editPath, "Community not found.");
  }

  revalidateCommunityPaths(communityId);
  redirectWithMessage(`/connect/communities/${communityId}`, "Community updated");
}

export async function deleteCommunityAction(formData: FormData) {
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
    redirectWithError(editPath, "Too many delete attempts. Please wait and try again.");
  }

  const supabase = await createClient();
  await verifyCommunityOwnershipOrRedirect(supabase, communityId, user.id, editPath);

  const { data: deleted, error: deleteError } = await supabase
    .from("communities")
    .delete()
    .eq("id", communityId)
    .eq("created_by", user.id)
    .select("id")
    .maybeSingle();

  if (deleteError) {
    redirectWithError(editPath, mapDeleteCommunityErrorMessage(deleteError.code));
  }

  if (!deleted) {
    redirectWithError(editPath, "Community not found.");
  }

  revalidateCommunityPaths(communityId);
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
