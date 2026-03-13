"use server";

import { revalidatePath } from "next/cache";
import {
  getStringValue,
  redirectWithError,
  redirectWithMessage,
  sanitizeInternalPath,
} from "@/lib/actions/helpers";
import { requireUser } from "@/lib/auth/session";
import {
  getModerationTargetLookup,
  getModerationTargetPath,
  isAdminUser,
} from "@/lib/moderation/data";
import { createAppError } from "@/lib/observability/errors";
import { logAppError, logInfo, logSecurityEvent } from "@/lib/observability/logger";
import { getRequestContext } from "@/lib/observability/request-context";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { createClient } from "@/lib/supabase/server";
import {
  reportContentSchema,
  resolveContentReportSchema,
  setContentHiddenSchema,
  type ModerationTargetType,
} from "@/lib/validation/moderation";

const REPORT_CONTENT_LIMIT = {
  maxHits: 20,
  windowMs: 10 * 60 * 1000,
};

const MODERATION_MUTATION_LIMIT = {
  maxHits: 120,
  windowMs: 10 * 60 * 1000,
};

function mapReportInsertErrorMessage(errorCode?: string): string {
  if (errorCode === "42501") {
    return "You cannot report this content.";
  }

  return "Failed to submit report.";
}

function mapContentModerationErrorMessage(errorCode?: string): string {
  if (errorCode === "42501") {
    return "You do not have permission to moderate this content.";
  }

  return "Failed to update content visibility.";
}

function revalidateTargetPaths(
  targetType: ModerationTargetType,
  targetId: string,
  options: { communityId?: string | null } = {},
) {
  revalidatePath("/home");
  revalidatePath("/search");
  revalidatePath("/profile/moderation");

  if (targetType === "listing") {
    revalidatePath("/market");
    revalidatePath("/market/my-listings");
    revalidatePath("/market/saved");
    revalidatePath(`/market/item/${targetId}`);
    return;
  }

  if (targetType === "event") {
    revalidatePath("/events");
    revalidatePath("/events/list");
    revalidatePath("/events/calendar");
    revalidatePath("/events/my-events");
    revalidatePath("/events/saved");
    revalidatePath(`/events/${targetId}`);
    return;
  }

  if (targetType === "community") {
    revalidatePath("/connect");
    revalidatePath("/connect/communities");
    revalidatePath("/connect/my-communities");
    revalidatePath(`/connect/communities/${targetId}`);
    return;
  }

  revalidatePath("/connect");
  revalidatePath("/connect/communities");
  revalidatePath("/connect/my-communities");

  if (options.communityId) {
    revalidatePath(`/connect/communities/${options.communityId}`);
  }
}

async function requireAdminOrRedirect(
  redirectPath: string,
  requestContext: Record<string, unknown>,
) {
  const user = await requireUser();

  if (!isAdminUser(user)) {
    logSecurityEvent("moderation_admin_violation", {
      ...requestContext,
      userId: user.id,
    });
    redirectWithError(redirectPath, "Not authorized.");
  }

  return user;
}

export async function reportContentAction(formData: FormData) {
  const requestContext = await getRequestContext({ action: "reportContentAction" });
  const parsed = reportContentSchema.safeParse({
    targetType: getStringValue(formData, "targetType"),
    targetId: getStringValue(formData, "targetId"),
    reason: getStringValue(formData, "reason"),
    note: getStringValue(formData, "note"),
    redirectTo: getStringValue(formData, "redirectTo"),
  });

  if (!parsed.success) {
    redirectWithError("/home", parsed.error.issues[0]?.message ?? "Invalid report input.");
  }

  const user = await requireUser();
  const rateResult = consumeRateLimit(`moderation:report-content:${user.id}`, REPORT_CONTENT_LIMIT);
  const initialFallbackPath = getModerationTargetPath(parsed.data.targetType, parsed.data.targetId);
  let redirectPath = sanitizeInternalPath(parsed.data.redirectTo, initialFallbackPath);

  if (!rateResult.allowed) {
    logSecurityEvent("moderation_report_rate_limited", {
      ...requestContext,
      userId: user.id,
      targetType: parsed.data.targetType,
      targetId: parsed.data.targetId,
      retryAfterMs: rateResult.retryAfterMs,
    });
    redirectWithError(redirectPath, "Too many report attempts. Please wait and try again.");
  }

  const supabase = await createClient();

  let target = null;
  try {
    target = await getModerationTargetLookup(supabase, parsed.data.targetType, parsed.data.targetId);
  } catch (targetLookupError) {
    logAppError(
      "moderation",
      "report_target_lookup_failed",
      createAppError("DATABASE_ERROR", "Target lookup failed during report action.", {
        safeMessage: "Failed to load content target.",
        cause: targetLookupError,
        metadata: {
          targetType: parsed.data.targetType,
          targetId: parsed.data.targetId,
          reporterId: user.id,
        },
      }),
      requestContext,
    );
    redirectWithError(redirectPath, "Failed to load content target.");
  }

  if (!target) {
    redirectWithError(redirectPath, "Content not found.");
  }

  if (target.targetType === "community_post" && target.communityId) {
    redirectPath = sanitizeInternalPath(
      parsed.data.redirectTo,
      getModerationTargetPath(target.targetType, target.targetId, {
        communityId: target.communityId,
      }),
    );
  }

  if (target.ownerId === user.id) {
    logSecurityEvent("moderation_self_report_blocked", {
      ...requestContext,
      userId: user.id,
      targetType: parsed.data.targetType,
      targetId: parsed.data.targetId,
    });
    redirectWithError(redirectPath, "You cannot report your own content.");
  }

  const { error: reportInsertError } = await supabase
    .from("content_reports")
    .insert({
      reporter_id: user.id,
      target_type: parsed.data.targetType,
      target_id: parsed.data.targetId,
      reason: parsed.data.reason,
      note: parsed.data.note,
    });

  if (reportInsertError?.code === "23505") {
    redirectWithMessage(redirectPath, "You already reported this content.");
  }

  if (reportInsertError) {
    logAppError(
      "moderation",
      "report_create_failed",
      createAppError("DATABASE_ERROR", reportInsertError.message, {
        safeMessage: mapReportInsertErrorMessage(reportInsertError.code),
        metadata: {
          code: reportInsertError.code,
          reporterId: user.id,
          targetType: parsed.data.targetType,
          targetId: parsed.data.targetId,
        },
      }),
      requestContext,
    );
    redirectWithError(redirectPath, mapReportInsertErrorMessage(reportInsertError.code));
  }

  revalidatePath("/profile/moderation");
  logInfo("moderation", "content_report_created", {
    ...requestContext,
    reporterId: user.id,
    targetType: parsed.data.targetType,
    targetId: parsed.data.targetId,
    reason: parsed.data.reason,
  });
  redirectWithMessage(redirectPath, "Report submitted.");
}

export async function setContentHiddenAction(formData: FormData) {
  const requestContext = await getRequestContext({ action: "setContentHiddenAction" });
  const parsed = setContentHiddenSchema.safeParse({
    targetType: getStringValue(formData, "targetType"),
    targetId: getStringValue(formData, "targetId"),
    isHiddenInput: getStringValue(formData, "isHiddenInput"),
    redirectTo: getStringValue(formData, "redirectTo"),
  });

  if (!parsed.success) {
    redirectWithError("/profile/moderation", parsed.error.issues[0]?.message ?? "Invalid moderation input.");
  }

  const redirectPath = sanitizeInternalPath(parsed.data.redirectTo, "/profile/moderation");
  const user = await requireAdminOrRedirect(redirectPath, requestContext);
  const mutationRateResult = consumeRateLimit(
    `moderation:set-hidden:${user.id}`,
    MODERATION_MUTATION_LIMIT,
  );

  if (!mutationRateResult.allowed) {
    logSecurityEvent("moderation_set_hidden_rate_limited", {
      ...requestContext,
      userId: user.id,
      targetType: parsed.data.targetType,
      targetId: parsed.data.targetId,
      retryAfterMs: mutationRateResult.retryAfterMs,
    });
    redirectWithError(redirectPath, "Too many moderation actions. Please wait and try again.");
  }

  const supabase = await createClient();

  let target = null;
  try {
    target = await getModerationTargetLookup(supabase, parsed.data.targetType, parsed.data.targetId);
  } catch (targetLookupError) {
    logAppError(
      "moderation",
      "moderation_target_lookup_failed",
      createAppError("DATABASE_ERROR", "Target lookup failed during moderation action.", {
        safeMessage: "Failed to load moderation target.",
        cause: targetLookupError,
        metadata: {
          targetType: parsed.data.targetType,
          targetId: parsed.data.targetId,
          actorId: user.id,
        },
      }),
      requestContext,
    );
    redirectWithError(redirectPath, "Failed to load moderation target.");
  }

  if (!target) {
    redirectWithError(redirectPath, "Content not found.");
  }

  if (target.isHidden === parsed.data.isHiddenInput) {
    redirectWithMessage(
      redirectPath,
      parsed.data.isHiddenInput ? "Content is already hidden." : "Content is already visible.",
    );
  }

  if (parsed.data.targetType === "listing") {
    const { data, error } = await supabase
      .from("listings")
      .update({ is_hidden: parsed.data.isHiddenInput })
      .eq("id", parsed.data.targetId)
      .select("id")
      .maybeSingle();

    if (error) {
      logAppError(
        "moderation",
        "listing_visibility_update_failed",
        createAppError("DATABASE_ERROR", error.message, {
          safeMessage: mapContentModerationErrorMessage(error.code),
          metadata: {
            code: error.code,
            targetType: parsed.data.targetType,
            targetId: parsed.data.targetId,
            actorId: user.id,
          },
        }),
        requestContext,
      );
      redirectWithError(redirectPath, mapContentModerationErrorMessage(error.code));
    }

    if (!data) {
      redirectWithError(redirectPath, "Content not found.");
    }
  } else if (parsed.data.targetType === "event") {
    const { data, error } = await supabase
      .from("events")
      .update({ is_hidden: parsed.data.isHiddenInput })
      .eq("id", parsed.data.targetId)
      .select("id")
      .maybeSingle();

    if (error) {
      logAppError(
        "moderation",
        "event_visibility_update_failed",
        createAppError("DATABASE_ERROR", error.message, {
          safeMessage: mapContentModerationErrorMessage(error.code),
          metadata: {
            code: error.code,
            targetType: parsed.data.targetType,
            targetId: parsed.data.targetId,
            actorId: user.id,
          },
        }),
        requestContext,
      );
      redirectWithError(redirectPath, mapContentModerationErrorMessage(error.code));
    }

    if (!data) {
      redirectWithError(redirectPath, "Content not found.");
    }
  } else if (parsed.data.targetType === "community") {
    const { data, error } = await supabase
      .from("communities")
      .update({ is_hidden: parsed.data.isHiddenInput })
      .eq("id", parsed.data.targetId)
      .select("id")
      .maybeSingle();

    if (error) {
      logAppError(
        "moderation",
        "community_visibility_update_failed",
        createAppError("DATABASE_ERROR", error.message, {
          safeMessage: mapContentModerationErrorMessage(error.code),
          metadata: {
            code: error.code,
            targetType: parsed.data.targetType,
            targetId: parsed.data.targetId,
            actorId: user.id,
          },
        }),
        requestContext,
      );
      redirectWithError(redirectPath, mapContentModerationErrorMessage(error.code));
    }

    if (!data) {
      redirectWithError(redirectPath, "Content not found.");
    }
  } else {
    const { data, error } = await supabase
      .from("community_posts")
      .update({ is_hidden: parsed.data.isHiddenInput })
      .eq("id", parsed.data.targetId)
      .select("id, community_id")
      .maybeSingle();

    if (error) {
      logAppError(
        "moderation",
        "community_post_visibility_update_failed",
        createAppError("DATABASE_ERROR", error.message, {
          safeMessage: mapContentModerationErrorMessage(error.code),
          metadata: {
            code: error.code,
            targetType: parsed.data.targetType,
            targetId: parsed.data.targetId,
            actorId: user.id,
          },
        }),
        requestContext,
      );
      redirectWithError(redirectPath, mapContentModerationErrorMessage(error.code));
    }

    if (!data) {
      redirectWithError(redirectPath, "Content not found.");
    }

    target = {
      ...target,
      communityId: data.community_id,
    };
  }

  revalidateTargetPaths(parsed.data.targetType, parsed.data.targetId, {
    communityId: target.communityId,
  });
  logInfo("moderation", "content_hidden_state_updated", {
    ...requestContext,
    actorId: user.id,
    targetType: parsed.data.targetType,
    targetId: parsed.data.targetId,
    isHidden: parsed.data.isHiddenInput,
  });
  redirectWithMessage(
    redirectPath,
    parsed.data.isHiddenInput ? "Content hidden." : "Content is visible again.",
  );
}

export async function resolveContentReportAction(formData: FormData) {
  const requestContext = await getRequestContext({ action: "resolveContentReportAction" });
  const parsed = resolveContentReportSchema.safeParse({
    reportId: getStringValue(formData, "reportId"),
    redirectTo: getStringValue(formData, "redirectTo"),
  });

  if (!parsed.success) {
    redirectWithError("/profile/moderation", parsed.error.issues[0]?.message ?? "Invalid report input.");
  }

  const redirectPath = sanitizeInternalPath(parsed.data.redirectTo, "/profile/moderation");
  const user = await requireAdminOrRedirect(redirectPath, requestContext);
  const mutationRateResult = consumeRateLimit(
    `moderation:resolve-report:${user.id}`,
    MODERATION_MUTATION_LIMIT,
  );

  if (!mutationRateResult.allowed) {
    logSecurityEvent("moderation_resolve_rate_limited", {
      ...requestContext,
      userId: user.id,
      reportId: parsed.data.reportId,
      retryAfterMs: mutationRateResult.retryAfterMs,
    });
    redirectWithError(redirectPath, "Too many moderation actions. Please wait and try again.");
  }

  const supabase = await createClient();
  const { data: deletedReport, error: deleteError } = await supabase
    .from("content_reports")
    .delete()
    .eq("id", parsed.data.reportId)
    .select("id")
    .maybeSingle();

  if (deleteError) {
    logAppError(
      "moderation",
      "report_resolve_failed",
      createAppError("DATABASE_ERROR", deleteError.message, {
        safeMessage: "Failed to resolve report.",
        metadata: {
          code: deleteError.code,
          reportId: parsed.data.reportId,
          actorId: user.id,
        },
      }),
      requestContext,
    );
    redirectWithError(redirectPath, "Failed to resolve report.");
  }

  if (!deletedReport) {
    redirectWithError(redirectPath, "Report not found.");
  }

  revalidatePath("/profile/moderation");
  logInfo("moderation", "report_resolved", {
    ...requestContext,
    actorId: user.id,
    reportId: parsed.data.reportId,
  });
  redirectWithMessage(redirectPath, "Report removed.");
}
