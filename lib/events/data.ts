import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import type { Database } from "@/types/database";

export type EventRow = Database["public"]["Tables"]["events"]["Row"];
export type EventParticipationStatus = Database["public"]["Tables"]["event_participants"]["Row"]["status"];

export type EventCardData = {
  id: string;
  title: string;
  date: string;
  location: string;
  category: string;
  status?: string;
};

type OrganizerProfile = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "user_id" | "full_name" | "school" | "major" | "year_label"
>;

function formatDayMonth(date: Date): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function formatEventDate(startsAt: string, endsAt: string | null): string {
  const start = new Date(startsAt);
  const startLabel = `${formatDayMonth(start)} - ${formatTime(start)}`;

  if (!endsAt) return startLabel;

  const end = new Date(endsAt);
  if (start.toDateString() === end.toDateString()) {
    return `${startLabel}-${formatTime(end)}`;
  }

  return `${startLabel} -> ${formatDayMonth(end)} - ${formatTime(end)}`;
}

export function toEventCardData(
  event: EventRow,
  options: { status?: string } = {},
): EventCardData {
  return {
    id: event.id,
    title: event.title,
    date: formatEventDate(event.starts_at, event.ends_at),
    location: event.location,
    category: event.category,
    status: options.status,
  };
}

export function formatParticipationLabel(status: EventParticipationStatus): string {
  return status === "joined" ? "Joined" : "Interested";
}

export async function getPublishedEvents(limit = 24): Promise<EventRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("is_published", true)
    .order("starts_at", { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error("Failed to load events.");
  }

  return data;
}

export async function getSavedEvents(): Promise<EventRow[]> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: savedRows, error: savedError } = await supabase
    .from("saved_events")
    .select("event_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (savedError) {
    throw new Error("Failed to load saved events.");
  }

  if (savedRows.length === 0) {
    return [];
  }

  const eventIds = savedRows.map((row) => row.event_id);
  const { data: events, error: eventsError } = await supabase
    .from("events")
    .select("*")
    .in("id", eventIds)
    .eq("is_published", true);

  if (eventsError) {
    throw new Error("Failed to load saved event details.");
  }

  const eventsById = new Map(events.map((event) => [event.id, event]));

  return eventIds
    .map((id) => eventsById.get(id))
    .filter((event): event is EventRow => Boolean(event));
}

export async function getMyEvents(
  status: EventParticipationStatus = "interested",
): Promise<EventRow[]> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: participantRows, error: participantError } = await supabase
    .from("event_participants")
    .select("event_id")
    .eq("user_id", user.id)
    .eq("status", status)
    .order("created_at", { ascending: false });

  if (participantError) {
    throw new Error("Failed to load your events.");
  }

  if (participantRows.length === 0) {
    return [];
  }

  const eventIds = participantRows.map((row) => row.event_id);
  const { data: events, error: eventsError } = await supabase
    .from("events")
    .select("*")
    .in("id", eventIds)
    .eq("is_published", true);

  if (eventsError) {
    throw new Error("Failed to load event details.");
  }

  const eventsById = new Map(events.map((event) => [event.id, event]));

  return eventIds
    .map((id) => eventsById.get(id))
    .filter((event): event is EventRow => Boolean(event));
}

export async function getEventDetail(eventId: string): Promise<{
  event: EventRow | null;
  organizer: OrganizerProfile | null;
  isSaved: boolean;
  participationStatus: EventParticipationStatus | null;
}> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .eq("is_published", true)
    .maybeSingle();

  if (eventError) {
    throw new Error("Failed to load event.");
  }

  if (!event) {
    return {
      event: null,
      organizer: null,
      isSaved: false,
      participationStatus: null,
    };
  }

  const [organizerResult, savedResult, participantResult] = await Promise.all([
    event.created_by
      ? supabase
          .from("profiles")
          .select("user_id, full_name, school, major, year_label")
          .eq("user_id", event.created_by)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from("saved_events")
      .select("event_id")
      .eq("user_id", user.id)
      .eq("event_id", event.id)
      .maybeSingle(),
    supabase
      .from("event_participants")
      .select("status")
      .eq("user_id", user.id)
      .eq("event_id", event.id)
      .maybeSingle(),
  ]);

  if (organizerResult.error) {
    throw new Error("Failed to load organizer profile.");
  }

  return {
    event,
    organizer: organizerResult.data,
    isSaved: Boolean(savedResult.data),
    participationStatus: participantResult.data?.status ?? null,
  };
}
