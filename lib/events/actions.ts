"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  getStringValue,
  redirectWithError,
  sanitizeInternalPath,
} from "@/lib/actions/helpers";
import { requireUser } from "@/lib/auth/session";
import { writeInAppNotification } from "@/lib/notifications/write";
import { createClient } from "@/lib/supabase/server";
import { eventParticipationSchema, toggleSavedEventSchema } from "@/lib/validation/events";

export async function toggleSavedEventAction(formData: FormData) {
  const parsed = toggleSavedEventSchema.safeParse({
    eventId: getStringValue(formData, "eventId"),
    redirectTo: getStringValue(formData, "redirectTo"),
  });

  if (!parsed.success) {
    redirectWithError("/events", parsed.error.issues[0]?.message ?? "Invalid save request.");
  }

  const user = await requireUser();
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
