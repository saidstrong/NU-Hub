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
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { createClient } from "@/lib/supabase/server";
import {
  eventCreateSchema,
  eventMutationIdSchema,
  eventParticipationSchema,
  nuLocalDateTimeToUtcIso,
  toggleSavedEventSchema,
} from "@/lib/validation/events";

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
  revalidatePath(`/events/${eventId}`);
  revalidatePath(`/events/${eventId}/edit`);
}

async function verifyEventOwnershipOrRedirect(
  supabase: SupabaseServerClient,
  eventId: string,
  userId: string,
  onErrorPath: string,
) {
  const { data: event, error } = await supabase
    .from("events")
    .select("id, created_by")
    .eq("id", eventId)
    .maybeSingle();

  if (error) {
    redirectWithError(onErrorPath, "Failed to load event.");
  }

  if (!event) {
    redirectWithError(onErrorPath, "Event not found.");
  }

  if (!isEventOwner(event.created_by, userId)) {
    redirectWithError(onErrorPath, "You can only manage your own events.");
  }
}

export async function createEventAction(formData: FormData) {
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
  const burstRateResult = consumeRateLimit(
    `events:create:burst:${user.id}`,
    CREATE_EVENT_BURST_LIMIT,
  );
  const windowRateResult = consumeRateLimit(
    `events:create:window:${user.id}`,
    CREATE_EVENT_WINDOW_LIMIT,
  );

  if (!burstRateResult.allowed || !windowRateResult.allowed) {
    redirectWithError("/events/create", "Too many event submissions. Please wait and try again.");
  }

  const startsAt = nuLocalDateTimeToUtcIso(parsed.data.startsAtInput);
  const endsAt = parsed.data.endsAtInput
    ? nuLocalDateTimeToUtcIso(parsed.data.endsAtInput)
    : null;

  if (!startsAt || (parsed.data.endsAtInput && !endsAt)) {
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
      is_published: parsed.data.isPublishedInput,
    })
    .select("id, is_published")
    .single();

  if (error || !created) {
    redirectWithError("/events/create", mapCreateEventErrorMessage(error?.code));
  }

  revalidateEventPaths(created.id);

  const successMessage = created.is_published ? "Event published." : "Draft saved.";
  redirectWithMessage(`/events/${created.id}`, successMessage);
}

export async function updateEventAction(formData: FormData) {
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
  const updateRateResult = consumeRateLimit(`events:update:${user.id}`, UPDATE_EVENT_LIMIT);

  if (!updateRateResult.allowed) {
    redirectWithError(editPath, "Too many update attempts. Please wait and try again.");
  }

  const startsAt = nuLocalDateTimeToUtcIso(parsed.data.startsAtInput);
  const endsAt = parsed.data.endsAtInput
    ? nuLocalDateTimeToUtcIso(parsed.data.endsAtInput)
    : null;

  if (!startsAt || (parsed.data.endsAtInput && !endsAt)) {
    redirectWithError(editPath, "Invalid event schedule.");
  }

  const supabase = await createClient();
  await verifyEventOwnershipOrRedirect(supabase, eventId, user.id, editPath);

  const { data: updated, error: updateError } = await supabase
    .from("events")
    .update({
      title: parsed.data.title,
      description: parsed.data.description,
      category: parsed.data.category,
      starts_at: startsAt,
      ends_at: endsAt,
      location: parsed.data.location,
      is_published: parsed.data.isPublishedInput,
    })
    .eq("id", eventId)
    .eq("created_by", user.id)
    .select("id")
    .maybeSingle();

  if (updateError) {
    redirectWithError(editPath, mapUpdateEventErrorMessage(updateError.code));
  }

  if (!updated) {
    redirectWithError(editPath, "Event not found.");
  }

  revalidateEventPaths(eventId);
  redirectWithMessage(`/events/${eventId}`, "Event updated");
}

export async function deleteEventAction(formData: FormData) {
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
    redirectWithError(editPath, "Too many delete attempts. Please wait and try again.");
  }

  const supabase = await createClient();
  await verifyEventOwnershipOrRedirect(supabase, eventId, user.id, editPath);

  const { data: deleted, error: deleteError } = await supabase
    .from("events")
    .delete()
    .eq("id", eventId)
    .eq("created_by", user.id)
    .select("id")
    .maybeSingle();

  if (deleteError) {
    redirectWithError(editPath, mapDeleteEventErrorMessage(deleteError.code));
  }

  if (!deleted) {
    redirectWithError(editPath, "Event not found.");
  }

  revalidateEventPaths(eventId);
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

  revalidatePath("/events");
  revalidatePath("/events/saved");
  revalidatePath(`/events/${parsed.data.eventId}`);

  const redirectTo = sanitizeInternalPath(parsed.data.redirectTo, `/events/${parsed.data.eventId}`);
  redirect(redirectTo);
}

export async function setEventParticipationAction(formData: FormData) {
  const parsed = eventParticipationSchema.safeParse({
    eventId: getStringValue(formData, "eventId"),
    status: getStringValue(formData, "status"),
    redirectTo: getStringValue(formData, "redirectTo"),
  });

  if (!parsed.success) {
    redirectWithError("/events", parsed.error.issues[0]?.message ?? "Invalid participation input.");
  }

  const user = await requireUser();
  const participationRateResult = consumeRateLimit(
    `events:set-participation:${user.id}`,
    EVENT_PARTICIPATION_LIMIT,
  );

  if (!participationRateResult.allowed) {
    redirectWithError("/events", "Too many participation updates. Please wait and try again.");
  }

  const supabase = await createClient();
  const { data: existingParticipation, error: existingParticipationError } = await supabase
    .from("event_participants")
    .select("status")
    .eq("event_id", parsed.data.eventId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingParticipationError) {
    redirectWithError("/events", "Failed to check event participation.");
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
    redirectWithError("/events", "Failed to update participation.");
  }

  if (!existingParticipation || existingParticipation.status !== parsed.data.status) {
    const { data: event } = await supabase
      .from("events")
      .select("title")
      .eq("id", parsed.data.eventId)
      .maybeSingle();

    const eventTitle = event?.title || "this event";
    await writeInAppNotification(supabase, {
      userId: user.id,
      type: "events",
      title: parsed.data.status === "joined" ? "Event joined" : "Event marked interested",
      message:
        parsed.data.status === "joined"
          ? `You joined ${eventTitle}.`
          : `You marked ${eventTitle} as interested.`,
      link: `/events/${parsed.data.eventId}`,
      payload: {
        kind: "event_participation_updated",
        event_id: parsed.data.eventId,
        status: parsed.data.status,
      },
    });
  }

  revalidatePath("/events");
  revalidatePath("/events/my-events");
  revalidatePath("/profile/notifications");
  revalidatePath(`/events/${parsed.data.eventId}`);

  const redirectTo = sanitizeInternalPath(parsed.data.redirectTo, `/events/${parsed.data.eventId}`);
  redirect(redirectTo);
}
