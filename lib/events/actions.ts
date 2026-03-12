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
import { writeInAppNotification } from "@/lib/notifications/write";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { createClient } from "@/lib/supabase/server";
import {
  eventCreateSchema,
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

  revalidatePath("/home");
  revalidatePath("/events");
  revalidatePath("/events/list");
  revalidatePath("/events/calendar");
  revalidatePath("/events/my-events");
  revalidatePath(`/events/${created.id}`);

  const successMessage = created.is_published ? "Event published." : "Draft saved.";
  redirectWithMessage(`/events/${created.id}`, successMessage);
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
