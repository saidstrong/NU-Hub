"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { writeInAppNotification } from "@/lib/notifications/write";
import { createClient } from "@/lib/supabase/server";
import {
  communityJoinSchema,
  communityRequestReviewSchema,
} from "@/lib/validation/connect";

function getStringValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function sanitizeInternalPath(path: string | undefined, fallback: string): string {
  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return fallback;
  }

  return path;
}

function appendSearchParam(path: string, key: "message" | "error", value: string): string {
  const [pathname, queryString = ""] = path.split("?");
  const params = new URLSearchParams(queryString);
  params.set(key, value);
  const nextQuery = params.toString();

  return nextQuery ? `${pathname}?${nextQuery}` : pathname;
}

function redirectWithError(path: string, message: string): never {
  redirect(appendSearchParam(path, "error", message));
}

function redirectWithMessage(path: string, message: string): never {
  redirect(appendSearchParam(path, "message", message));
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
