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
import { isEventOwner } from "@/lib/events/ownership";
import { writeInAppNotification } from "@/lib/notifications/write";
import { createAppError } from "@/lib/observability/errors";
import {
  getDurationMs,
  logAppError,
  logInfo,
  logSecurityEvent,
  logWarn,
} from "@/lib/observability/logger";
import { getRequestContext } from "@/lib/observability/request-context";
import { consumeDistributedRateLimit, consumeRateLimit } from "@/lib/security/rate-limit";
import { createClient } from "@/lib/supabase/server";
import {
  clearEventParticipationSchema,
  eventCreateSchema,
  eventMutationIdSchema,
  eventParticipationSchema,
  nuLocalDateTimeToUtcIso,
  toggleSavedEventSchema,
} from "@/lib/validation/events";
import {
  EVENT_COVER_MAX_SIZE_BYTES,
  createMediaFilename,
  hasValidImageSignature,
  removeStorageObjectBestEffort,
  validateImageFileMeta,
} from "@/lib/validation/media";

const CREATE_EVENT_BURST_LIMIT = {
  maxHits: 1,
  windowMs: 10 * 1000,
};

const CREATE_EVENT_WINDOW_LIMIT = {
  maxHits: 8,
  windowMs: 30 * 60 * 1000,
};

const UPDATE_EVENT_LIMIT = {
  maxHits: 24,
  windowMs: 15 * 60 * 1000,
};

const DELETE_EVENT_LIMIT = {
  maxHits: 8,
  windowMs: 30 * 60 * 1000,
};

const SAVE_EVENT_TOGGLE_LIMIT = {
  maxHits: 40,
  windowMs: 10 * 60 * 1000,
};

const EVENT_PARTICIPATION_LIMIT = {
  maxHits: 40,
  windowMs: 10 * 60 * 1000,
};
const EVENT_PARTICIPATION_BURST_LIMIT = {
  maxHits: 12,
  windowMs: 30 * 1000,
};
const EVENT_REVIEW_LIMIT = {
  maxHits: 120,
  windowMs: 10 * 60 * 1000,
};
// Best-effort only in serverless: this in-memory limiter is instance-local.
const ACTION_SLOW_THRESHOLD_MS = 250;
const EVENT_IMAGES_BUCKET = "event-images";

function isAdminUser(user: Awaited<ReturnType<typeof requireUser>>): boolean {
  const metadata = user.app_metadata;
  if (!metadata || typeof metadata !== "object") {
    return false;
  }

  return (metadata as Record<string, unknown>).role === "admin";
}

function getRequestIdFromContext(context: Record<string, unknown>): string {
  return typeof context.requestId === "string" && context.requestId.length > 0
    ? context.requestId
    : "unknown";
}

function mapCreateEventErrorMessage(errorCode?: string): string {
  if (errorCode === "23503") {
    return "Your profile is not ready yet. Open your profile once and try again.";
  }

  if (errorCode === "42501") {
    return "You do not have permission to create events.";
  }

  return "Failed to create event. Please try again.";
}

function mapUpdateEventErrorMessage(errorCode?: string): string {
  if (errorCode === "42501") {
    return "You do not have permission to edit this event.";
  }

  return "Failed to update event. Please try again.";
}

function mapDeleteEventErrorMessage(errorCode?: string): string {
  if (errorCode === "42501") {
    return "You do not have permission to delete this event.";
  }

  return "Failed to delete event. Please try again.";
}

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

function revalidateEventPaths(eventId: string) {
  revalidatePath("/home");
  revalidatePath("/events");
  revalidatePath("/events/list");
  revalidatePath("/events/calendar");
  revalidatePath("/events/my-events");
  revalidatePath("/events/saved");
  revalidatePath("/profile/moderation");
  revalidatePath(`/events/${eventId}`);
  revalidatePath(`/events/${eventId}/edit`);
}

function getOptionalFile(formData: FormData, key: string): File | null {
  const value = formData.get(key);
  if (!(value instanceof File) || value.size <= 0) {
    return null;
  }

  return value;
}

async function cleanupFailedEventCreate(
  supabase: SupabaseServerClient,
  eventId: string,
  uploadedCoverPath: string | null = null,
) {
  await removeStorageObjectBestEffort(supabase, EVENT_IMAGES_BUCKET, uploadedCoverPath);
  await supabase.from("events").delete().eq("id", eventId);
}

async function verifyEventOwnershipOrRedirect(
  supabase: SupabaseServerClient,
  eventId: string,
  userId: string,
  onErrorPath: string,
  requestContext: Record<string, unknown>,
) {
  const { data: event, error } = await supabase
    .from("events")
    .select("id, created_by, cover_path, is_published, is_hidden")
    .eq("id", eventId)
    .maybeSingle();

  if (error) {
    redirectWithError(onErrorPath, "Failed to load event.");
  }

  if (!event) {
    redirectWithError(onErrorPath, "Event not found.");
  }

  if (!isEventOwner(event.created_by, userId)) {
    logSecurityEvent("event_ownership_violation", {
      ...requestContext,
      eventId,
      ownerId: event.created_by,
      actorId: userId,
    });
    redirectWithError(onErrorPath, "You can only manage your own events.");
  }

  return event;
}

export async function createEventAction(formData: FormData) {
  const requestContext = await getRequestContext({ action: "createEventAction" });
  const parsed = eventCreateSchema.safeParse({
    title: getStringValue(formData, "title"),
    description: getStringValue(formData, "description"),
    category: getStringValue(formData, "category"),
    startsAtInput: getStringValue(formData, "startsAtInput"),
    endsAtInput: getStringValue(formData, "endsAtInput"),
    location: getStringValue(formData, "location"),
    isPublishedInput: getStringValue(formData, "isPublishedInput"),
  });

  if (!parsed.success) {
    redirectWithError("/events/create", parsed.error.issues[0]?.message ?? "Invalid event input.");
  }

  const user = await requireUser();
  const adminUser = isAdminUser(user);
  const coverFile = getOptionalFile(formData, "coverImage");

  if (coverFile) {
    const imageMetaError = validateImageFileMeta(coverFile, EVENT_COVER_MAX_SIZE_BYTES);
    if (imageMetaError) {
      redirectWithError("/events/create", imageMetaError);
    }

    const hasValidSignature = await hasValidImageSignature(coverFile);
    if (!hasValidSignature) {
      redirectWithError("/events/create", "Invalid image content. Upload JPEG, PNG, or WEBP files only.");
    }
  }

  const burstRateResult = consumeRateLimit(
    `events:create:burst:${user.id}`,
    CREATE_EVENT_BURST_LIMIT,
  );
  const windowRateResult = consumeRateLimit(
    `events:create:window:${user.id}`,
    CREATE_EVENT_WINDOW_LIMIT,
  );

  if (!burstRateResult.allowed || !windowRateResult.allowed) {
    logSecurityEvent("event_create_rate_limited", {
      ...requestContext,
      userId: user.id,
      retryAfterMs: Math.max(burstRateResult.retryAfterMs, windowRateResult.retryAfterMs),
    });
    redirectWithError("/events/create", "Too many event submissions. Please wait and try again.");
  }

  const startsAt = nuLocalDateTimeToUtcIso(parsed.data.startsAtInput);
  const endsAt = parsed.data.endsAtInput
    ? nuLocalDateTimeToUtcIso(parsed.data.endsAtInput)
    : null;

  if (!startsAt || (parsed.data.endsAtInput && !endsAt)) {
    logWarn("events", "event_create_invalid_schedule", {
      ...requestContext,
      userId: user.id,
    });
    redirectWithError("/events/create", "Invalid event schedule.");
  }

  const supabase = await createClient();
  const { data: created, error } = await supabase
    .from("events")
    .insert({
      created_by: user.id,
      title: parsed.data.title,
      description: parsed.data.description,
      category: parsed.data.category,
      starts_at: startsAt,
      ends_at: endsAt,
      location: parsed.data.location,
      is_published: adminUser && parsed.data.isPublishedInput,
      is_hidden: false,
    })
    .select("id, is_published")
    .single();

  if (error || !created) {
    logAppError(
      "events",
      "event_create_failed",
      createAppError("DATABASE_ERROR", error?.message ?? "Event insert returned empty response.", {
        safeMessage: mapCreateEventErrorMessage(error?.code),
        metadata: {
          code: error?.code ?? null,
          userId: user.id,
        },
      }),
      requestContext,
    );
    redirectWithError("/events/create", mapCreateEventErrorMessage(error?.code));
  }

  if (coverFile) {
    const coverPath = `${user.id}/${created.id}/${createMediaFilename("cover", coverFile)}`;
    const { error: coverUploadError } = await supabase.storage
      .from(EVENT_IMAGES_BUCKET)
      .upload(coverPath, coverFile, {
        upsert: false,
        contentType: coverFile.type,
      });

    if (coverUploadError) {
      await cleanupFailedEventCreate(supabase, created.id);
      redirectWithError("/events/create", "Failed to upload event cover.");
    }

    const { error: coverPathUpdateError } = await supabase
      .from("events")
      .update({ cover_path: coverPath })
      .eq("id", created.id)
      .eq("created_by", user.id);

    if (coverPathUpdateError) {
      await cleanupFailedEventCreate(supabase, created.id, coverPath);
      redirectWithError("/events/create", "Failed to save event cover.");
    }
  }

  revalidateEventPaths(created.id);

  const successMessage = created.is_published ? "Event published." : "Event submitted for review.";
  logInfo("events", "event_created", {
    ...requestContext,
    userId: user.id,
    eventId: created.id,
    isPublished: created.is_published,
  });
  redirectWithMessage(`/events/${created.id}`, successMessage);
}

export async function updateEventAction(formData: FormData) {
  const requestContext = await getRequestContext({ action: "updateEventAction" });
  const parsedEventId = eventMutationIdSchema.safeParse({
    eventId: getStringValue(formData, "eventId"),
  });

  if (!parsedEventId.success) {
    redirectWithError("/events", parsedEventId.error.issues[0]?.message ?? "Invalid event id.");
  }

  const eventId = parsedEventId.data.eventId;
  const editPath = `/events/${eventId}/edit`;
  const parsed = eventCreateSchema.safeParse({
    title: getStringValue(formData, "title"),
    description: getStringValue(formData, "description"),
    category: getStringValue(formData, "category"),
    startsAtInput: getStringValue(formData, "startsAtInput"),
    endsAtInput: getStringValue(formData, "endsAtInput"),
    location: getStringValue(formData, "location"),
    isPublishedInput: getStringValue(formData, "isPublishedInput"),
  });

  if (!parsed.success) {
    redirectWithError(editPath, parsed.error.issues[0]?.message ?? "Invalid event input.");
  }

  const user = await requireUser();
  const coverFile = getOptionalFile(formData, "coverImage");

  if (coverFile) {
    const imageMetaError = validateImageFileMeta(coverFile, EVENT_COVER_MAX_SIZE_BYTES);
    if (imageMetaError) {
      redirectWithError(editPath, imageMetaError);
    }

    const hasValidSignature = await hasValidImageSignature(coverFile);
    if (!hasValidSignature) {
      redirectWithError(editPath, "Invalid image content. Upload JPEG, PNG, or WEBP files only.");
    }
  }

  const updateRateResult = consumeRateLimit(`events:update:${user.id}`, UPDATE_EVENT_LIMIT);

  if (!updateRateResult.allowed) {
    logSecurityEvent("event_update_rate_limited", {
      ...requestContext,
      userId: user.id,
      eventId,
      retryAfterMs: updateRateResult.retryAfterMs,
    });
    redirectWithError(editPath, "Too many update attempts. Please wait and try again.");
  }

  const startsAt = nuLocalDateTimeToUtcIso(parsed.data.startsAtInput);
  const endsAt = parsed.data.endsAtInput
    ? nuLocalDateTimeToUtcIso(parsed.data.endsAtInput)
    : null;

  if (!startsAt || (parsed.data.endsAtInput && !endsAt)) {
    logWarn("events", "event_update_invalid_schedule", {
      ...requestContext,
      userId: user.id,
      eventId,
    });
    redirectWithError(editPath, "Invalid event schedule.");
  }

  const supabase = await createClient();
  const ownedEvent = await verifyEventOwnershipOrRedirect(
    supabase,
    eventId,
    user.id,
    editPath,
    requestContext,
  );

  let uploadedCoverPath: string | null = null;
  if (coverFile) {
    uploadedCoverPath = `${user.id}/${eventId}/${createMediaFilename("cover", coverFile)}`;
    const { error: coverUploadError } = await supabase.storage
      .from(EVENT_IMAGES_BUCKET)
      .upload(uploadedCoverPath, coverFile, {
        upsert: false,
        contentType: coverFile.type,
      });

    if (coverUploadError) {
      redirectWithError(editPath, "Failed to upload event cover.");
    }
  }

  const { data: updated, error: updateError } = await supabase
    .from("events")
    .update({
      // Editing a rejected event re-submits it for review.
      // approved  (true,false)  -> stays approved
      // pending   (false,false) -> stays pending
      // rejected  (false,true)  -> becomes pending (false,false)
      is_hidden: !ownedEvent.is_published && ownedEvent.is_hidden ? false : ownedEvent.is_hidden,
      title: parsed.data.title,
      description: parsed.data.description,
      category: parsed.data.category,
      starts_at: startsAt,
      ends_at: endsAt,
      location: parsed.data.location,
      // Creator edits must not bypass approval state.
      is_published: ownedEvent.is_published,
      cover_path: uploadedCoverPath ?? ownedEvent.cover_path,
    })
    .eq("id", eventId)
    .eq("created_by", user.id)
    .select("id")
    .maybeSingle();

  if (updateError) {
    if (uploadedCoverPath) {
      await removeStorageObjectBestEffort(supabase, EVENT_IMAGES_BUCKET, uploadedCoverPath);
    }
    logAppError(
      "events",
      "event_update_failed",
      createAppError("DATABASE_ERROR", updateError.message, {
        safeMessage: mapUpdateEventErrorMessage(updateError.code),
        metadata: {
          code: updateError.code,
          userId: user.id,
          eventId,
        },
      }),
      requestContext,
    );
    redirectWithError(editPath, mapUpdateEventErrorMessage(updateError.code));
  }

  if (!updated) {
    if (uploadedCoverPath) {
      await removeStorageObjectBestEffort(supabase, EVENT_IMAGES_BUCKET, uploadedCoverPath);
    }
    logWarn("events", "event_update_missing_row", {
      ...requestContext,
      userId: user.id,
      eventId,
    });
    redirectWithError(editPath, "Event not found.");
  }

  if (uploadedCoverPath && ownedEvent.cover_path && ownedEvent.cover_path !== uploadedCoverPath) {
    await removeStorageObjectBestEffort(supabase, EVENT_IMAGES_BUCKET, ownedEvent.cover_path);
  }

  revalidateEventPaths(eventId);
  logInfo("events", "event_updated", {
    ...requestContext,
    userId: user.id,
    eventId,
  });
  redirectWithMessage(`/events/${eventId}`, "Event updated");
}

export async function approveEventAction(formData: FormData) {
  const parsed = eventMutationIdSchema.safeParse({
    eventId: getStringValue(formData, "eventId"),
  });

  if (!parsed.success) {
    redirectWithError("/profile/moderation", parsed.error.issues[0]?.message ?? "Invalid event id.");
  }

  const redirectPath = sanitizeInternalPath(
    getStringValue(formData, "redirectTo"),
    "/profile/moderation",
  );
  const user = await requireUser();
  if (!isAdminUser(user)) {
    redirectWithError(redirectPath, "Not authorized.");
  }

  const rateResult = consumeRateLimit(`events:review:approve:${user.id}`, EVENT_REVIEW_LIMIT);
  if (!rateResult.allowed) {
    redirectWithError(redirectPath, "Too many moderation actions. Please wait and try again.");
  }

  const supabase = await createClient();
  const { data: approved, error } = await supabase
    .from("events")
    .update({
      is_published: true,
      is_hidden: false,
    })
    .eq("id", parsed.data.eventId)
    .select("id")
    .maybeSingle();

  if (error) {
    redirectWithError(redirectPath, "Failed to approve event.");
  }

  if (!approved) {
    redirectWithError(redirectPath, "Event not found.");
  }

  revalidateEventPaths(parsed.data.eventId);
  redirectWithMessage(redirectPath, "Event approved.");
}

export async function rejectEventAction(formData: FormData) {
  const parsed = eventMutationIdSchema.safeParse({
    eventId: getStringValue(formData, "eventId"),
  });

  if (!parsed.success) {
    redirectWithError("/profile/moderation", parsed.error.issues[0]?.message ?? "Invalid event id.");
  }

  const redirectPath = sanitizeInternalPath(
    getStringValue(formData, "redirectTo"),
    "/profile/moderation",
  );
  const user = await requireUser();
  if (!isAdminUser(user)) {
    redirectWithError(redirectPath, "Not authorized.");
  }

  const rateResult = consumeRateLimit(`events:review:reject:${user.id}`, EVENT_REVIEW_LIMIT);
  if (!rateResult.allowed) {
    redirectWithError(redirectPath, "Too many moderation actions. Please wait and try again.");
  }

  const supabase = await createClient();
  const { data: rejected, error } = await supabase
    .from("events")
    .update({
      is_published: false,
      is_hidden: true,
    })
    .eq("id", parsed.data.eventId)
    .select("id")
    .maybeSingle();

  if (error) {
    redirectWithError(redirectPath, "Failed to reject event.");
  }

  if (!rejected) {
    redirectWithError(redirectPath, "Event not found.");
  }

  revalidateEventPaths(parsed.data.eventId);
  redirectWithMessage(redirectPath, "Event rejected.");
}

export async function deleteEventAction(formData: FormData) {
  const requestContext = await getRequestContext({ action: "deleteEventAction" });
  const parsed = eventMutationIdSchema.safeParse({
    eventId: getStringValue(formData, "eventId"),
  });

  if (!parsed.success) {
    redirectWithError("/events", parsed.error.issues[0]?.message ?? "Invalid event id.");
  }

  const eventId = parsed.data.eventId;
  const editPath = `/events/${eventId}/edit`;
  const user = await requireUser();
  const deleteRateResult = consumeRateLimit(`events:delete:${user.id}`, DELETE_EVENT_LIMIT);

  if (!deleteRateResult.allowed) {
    logSecurityEvent("event_delete_rate_limited", {
      ...requestContext,
      userId: user.id,
      eventId,
      retryAfterMs: deleteRateResult.retryAfterMs,
    });
    redirectWithError(editPath, "Too many delete attempts. Please wait and try again.");
  }

  const supabase = await createClient();
  const ownedEvent = await verifyEventOwnershipOrRedirect(
    supabase,
    eventId,
    user.id,
    editPath,
    requestContext,
  );

  const { data: deleted, error: deleteError } = await supabase
    .from("events")
    .delete()
    .eq("id", eventId)
    .eq("created_by", user.id)
    .select("id")
    .maybeSingle();

  if (deleteError) {
    logAppError(
      "events",
      "event_delete_failed",
      createAppError("DATABASE_ERROR", deleteError.message, {
        safeMessage: mapDeleteEventErrorMessage(deleteError.code),
        metadata: {
          code: deleteError.code,
          userId: user.id,
          eventId,
        },
      }),
      requestContext,
    );
    redirectWithError(editPath, mapDeleteEventErrorMessage(deleteError.code));
  }

  if (!deleted) {
    logWarn("events", "event_delete_missing_row", {
      ...requestContext,
      userId: user.id,
      eventId,
    });
    redirectWithError(editPath, "Event not found.");
  }

  await removeStorageObjectBestEffort(supabase, EVENT_IMAGES_BUCKET, ownedEvent.cover_path);

  revalidateEventPaths(eventId);
  logInfo("events", "event_deleted", {
    ...requestContext,
    userId: user.id,
    eventId,
  });
  redirectWithMessage("/events/my-events", "Event deleted");
}

export async function toggleSavedEventAction(formData: FormData) {
  const parsed = toggleSavedEventSchema.safeParse({
    eventId: getStringValue(formData, "eventId"),
    redirectTo: getStringValue(formData, "redirectTo"),
  });

  if (!parsed.success) {
    redirectWithError("/events", parsed.error.issues[0]?.message ?? "Invalid save request.");
  }

  const user = await requireUser();
  const saveToggleRateResult = consumeRateLimit(`events:toggle-saved:${user.id}`, SAVE_EVENT_TOGGLE_LIMIT);

  if (!saveToggleRateResult.allowed) {
    redirectWithError("/events", "Too many save actions. Please wait and try again.");
  }

  const supabase = await createClient();

  const { data: existing, error: existingError } = await supabase
    .from("saved_events")
    .select("event_id")
    .eq("user_id", user.id)
    .eq("event_id", parsed.data.eventId)
    .maybeSingle();

  if (existingError) {
    redirectWithError("/events", "Failed to check saved event.");
  }

  if (existing) {
    const { error: deleteError } = await supabase
      .from("saved_events")
      .delete()
      .eq("user_id", user.id)
      .eq("event_id", parsed.data.eventId);

    if (deleteError) {
      redirectWithError("/events", "Failed to unsave event.");
    }
  } else {
    const { error: insertError } = await supabase
      .from("saved_events")
      .insert({
        user_id: user.id,
        event_id: parsed.data.eventId,
      });

    if (insertError?.code === "23505") {
      const redirectTo = sanitizeInternalPath(parsed.data.redirectTo, `/events/${parsed.data.eventId}`);
      redirect(redirectTo);
    }

    if (insertError) {
      redirectWithError("/events", "Failed to save event.");
    }
  }

  revalidatePath("/events/saved");
  revalidatePath(`/events/${parsed.data.eventId}`);

  const redirectTo = sanitizeInternalPath(parsed.data.redirectTo, `/events/${parsed.data.eventId}`);
  redirect(redirectTo);
}

export async function setEventParticipationAction(formData: FormData) {
  const requestContext = await getRequestContext({
    action: "setEventParticipationAction",
    route: "/events/[id]",
  });
  const startedAt = performance.now();
  const parsed = eventParticipationSchema.safeParse({
    eventId: getStringValue(formData, "eventId"),
    status: getStringValue(formData, "status"),
    redirectTo: getStringValue(formData, "redirectTo"),
  });

  if (!parsed.success) {
    redirectWithError("/events", parsed.error.issues[0]?.message ?? "Invalid participation input.");
  }

  const user = await requireUser();
  const requestId = getRequestIdFromContext(requestContext);
  const participationBurstRateResult = await consumeDistributedRateLimit(
    `events:set-participation:burst:${user.id}:${parsed.data.eventId}`,
    EVENT_PARTICIPATION_BURST_LIMIT,
    {
      action: "setEventParticipationAction",
      userId: user.id,
      targetId: parsed.data.eventId,
      requestId,
    },
  );
  const participationRateResult = await consumeDistributedRateLimit(
    `events:set-participation:${user.id}`,
    EVENT_PARTICIPATION_LIMIT,
    {
      action: "setEventParticipationAction",
      userId: user.id,
      targetId: parsed.data.eventId,
      requestId,
    },
  );

  if (!participationBurstRateResult.allowed || !participationRateResult.allowed) {
    logSecurityEvent("event_rsvp_set_rate_limited", {
      ...requestContext,
      action: "setEventParticipationAction",
      userId: user.id,
      route: `/events/${parsed.data.eventId}`,
      durationMs: getDurationMs(startedAt),
      outcome: "rate_limited",
      eventId: parsed.data.eventId,
      retryAfterMs: Math.max(participationBurstRateResult.retryAfterMs, participationRateResult.retryAfterMs),
    });
    redirectWithError("/events", "Too many participation updates. Please wait and try again.");
  }

  const supabase = await createClient();
  const { data: existingParticipation, error: existingParticipationError } = await supabase
    .from("event_participants")
    .select("event_id")
    .eq("event_id", parsed.data.eventId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingParticipationError) {
    logWarn("events", "event_rsvp_existing_lookup_failed", {
      ...requestContext,
      action: "setEventParticipationAction",
      userId: user.id,
      route: `/events/${parsed.data.eventId}`,
      durationMs: getDurationMs(startedAt),
      outcome: "error",
      eventId: parsed.data.eventId,
      errorCode: existingParticipationError.code ?? null,
    });
    redirectWithError("/events", "Failed to update participation.");
  }

  const { error } = await supabase.from("event_participants").upsert(
    {
      event_id: parsed.data.eventId,
      user_id: user.id,
      status: parsed.data.status,
    },
    { onConflict: "event_id,user_id" },
  );

  if (error) {
    logWarn("events", "event_rsvp_upsert_failed", {
      ...requestContext,
      action: "setEventParticipationAction",
      userId: user.id,
      route: `/events/${parsed.data.eventId}`,
      durationMs: getDurationMs(startedAt),
      outcome: "error",
      eventId: parsed.data.eventId,
      errorCode: error.code ?? null,
    });
    redirectWithError("/events", "Failed to update participation.");
  }

  if (!existingParticipation) {
    const { data: eventOwner, error: eventOwnerError } = await supabase
      .from("events")
      .select("id, created_by, title")
      .eq("id", parsed.data.eventId)
      .maybeSingle();

    if (!eventOwnerError && eventOwner?.created_by && eventOwner.created_by !== user.id) {
      await writeInAppNotification(supabase, {
        userId: eventOwner.created_by,
        type: "events",
        title: "New RSVP on your event",
        message:
          parsed.data.status === "going"
            ? `Someone is going to ${eventOwner.title ?? "your event"}.`
            : `Someone is interested in ${eventOwner.title ?? "your event"}.`,
        link: `/events/${parsed.data.eventId}`,
        payload: {
          kind: "event_rsvp_created",
          event_id: parsed.data.eventId,
          rsvp_status: parsed.data.status,
        },
      });
      revalidatePath("/profile/notifications");
    }
  }

  revalidatePath("/events/my-events");
  revalidatePath(`/events/${parsed.data.eventId}`);

  const durationMs = getDurationMs(startedAt);
  const timingContext = {
    ...requestContext,
    action: "setEventParticipationAction",
    userId: user.id,
    route: `/events/${parsed.data.eventId}`,
    durationMs,
    outcome: "success",
    eventId: parsed.data.eventId,
    status: parsed.data.status,
  };
  logInfo("events", "event_rsvp_set", timingContext);
  if (durationMs > ACTION_SLOW_THRESHOLD_MS) {
    logWarn("events", "event_rsvp_set_slow", timingContext);
  }

  const redirectTo = sanitizeInternalPath(parsed.data.redirectTo, `/events/${parsed.data.eventId}`);
  redirect(redirectTo);
}

export async function clearEventParticipationAction(formData: FormData) {
  const requestContext = await getRequestContext({
    action: "clearEventParticipationAction",
    route: "/events/[id]",
  });
  const startedAt = performance.now();
  const parsed = clearEventParticipationSchema.safeParse({
    eventId: getStringValue(formData, "eventId"),
    redirectTo: getStringValue(formData, "redirectTo"),
  });

  if (!parsed.success) {
    redirectWithError("/events", parsed.error.issues[0]?.message ?? "Invalid RSVP clear input.");
  }

  const user = await requireUser();
  const requestId = getRequestIdFromContext(requestContext);
  const participationBurstRateResult = await consumeDistributedRateLimit(
    `events:clear-participation:burst:${user.id}:${parsed.data.eventId}`,
    EVENT_PARTICIPATION_BURST_LIMIT,
    {
      action: "clearEventParticipationAction",
      userId: user.id,
      targetId: parsed.data.eventId,
      requestId,
    },
  );
  const participationRateResult = await consumeDistributedRateLimit(
    `events:clear-participation:${user.id}`,
    EVENT_PARTICIPATION_LIMIT,
    {
      action: "clearEventParticipationAction",
      userId: user.id,
      targetId: parsed.data.eventId,
      requestId,
    },
  );

  if (!participationBurstRateResult.allowed || !participationRateResult.allowed) {
    logSecurityEvent("event_rsvp_clear_rate_limited", {
      ...requestContext,
      action: "clearEventParticipationAction",
      userId: user.id,
      route: `/events/${parsed.data.eventId}`,
      durationMs: getDurationMs(startedAt),
      outcome: "rate_limited",
      eventId: parsed.data.eventId,
      retryAfterMs: Math.max(participationBurstRateResult.retryAfterMs, participationRateResult.retryAfterMs),
    });
    redirectWithError("/events", "Too many RSVP updates. Please wait and try again.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("event_participants")
    .delete()
    .eq("event_id", parsed.data.eventId)
    .eq("user_id", user.id);

  if (error) {
    logWarn("events", "event_rsvp_clear_failed", {
      ...requestContext,
      action: "clearEventParticipationAction",
      userId: user.id,
      route: `/events/${parsed.data.eventId}`,
      durationMs: getDurationMs(startedAt),
      outcome: "error",
      eventId: parsed.data.eventId,
      errorCode: error.code ?? null,
    });
    redirectWithError("/events", "Failed to clear RSVP.");
  }

  revalidatePath("/events/my-events");
  revalidatePath(`/events/${parsed.data.eventId}`);

  const durationMs = getDurationMs(startedAt);
  const timingContext = {
    ...requestContext,
    action: "clearEventParticipationAction",
    userId: user.id,
    route: `/events/${parsed.data.eventId}`,
    durationMs,
    outcome: "success",
    eventId: parsed.data.eventId,
  };
  logInfo("events", "event_rsvp_cleared", timingContext);
  if (durationMs > ACTION_SLOW_THRESHOLD_MS) {
    logWarn("events", "event_rsvp_clear_slow", timingContext);
  }

  const redirectTo = sanitizeInternalPath(parsed.data.redirectTo, `/events/${parsed.data.eventId}`);
  redirect(redirectTo);
}
