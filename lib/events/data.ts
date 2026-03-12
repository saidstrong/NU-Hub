import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import { isEventOwner } from "@/lib/events/ownership";
import { createPaginationWindow, splitPaginatedRows } from "@/lib/pagination";
import type { Database } from "@/types/database";

export type EventRow = Database["public"]["Tables"]["events"]["Row"];
export type EventParticipationStatus = Database["public"]["Tables"]["event_participants"]["Row"]["status"];
export type EventCardSource = Pick<
  EventRow,
  "id" | "title" | "starts_at" | "ends_at" | "location" | "category"
>;
export type EventCreatedCardSource = EventCardSource & {
  is_published: boolean;
};
export type EventEditSource = Pick<
  EventRow,
  | "id"
  | "created_by"
  | "title"
  | "description"
  | "category"
  | "starts_at"
  | "ends_at"
  | "location"
  | "is_published"
>;

export type EventCardData = {
  id: string;
  title: string;
  date: string;
  location: string;
  category: string;
  status?: string;
};
export type PaginatedEventResult<TEvent> = {
  events: TEvent[];
  hasMore: boolean;
};

type OrganizerProfile = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "user_id" | "full_name" | "school" | "major" | "year_label"
>;
const EVENT_CARD_SELECT = "id, title, starts_at, ends_at, location, category";
const EVENT_CREATED_CARD_SELECT = `${EVENT_CARD_SELECT}, is_published`;
const EVENT_EDIT_SELECT =
  "id, created_by, title, description, category, starts_at, ends_at, location, is_published";

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
  event: EventCardSource,
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

export async function getPublishedEvents(limit = 24): Promise<EventCardSource[]> {
  const { events } = await getPublishedEventsPage(1, limit);
  return events;
}

export async function getPublishedEventsPage(
  page = 1,
  pageSize = 24,
): Promise<PaginatedEventResult<EventCardSource>> {
  const { from, to, pageSize: safePageSize } = createPaginationWindow({
    page,
    pageSize,
    defaultPageSize: 24,
    maxPageSize: 48,
  });
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("events")
    .select(EVENT_CARD_SELECT)
    .eq("is_published", true)
    .order("starts_at", { ascending: true })
    .order("id", { ascending: true })
    .range(from, to);

  if (error) {
    throw new Error("Failed to load events.");
  }

  const paged = splitPaginatedRows(data, safePageSize);
  return {
    events: paged.rows,
    hasMore: paged.hasMore,
  };
}

export async function getSavedEvents(): Promise<EventCardSource[]> {
  const { events } = await getSavedEventsPage(1, 50);
  return events;
}

export async function getSavedEventsPage(
  page = 1,
  pageSize = 20,
): Promise<PaginatedEventResult<EventCardSource>> {
  const user = await requireUser();
  const { from, to, pageSize: safePageSize } = createPaginationWindow({
    page,
    pageSize,
    defaultPageSize: 20,
    maxPageSize: 40,
  });
  const supabase = await createClient();

  const { data: savedRows, error: savedError } = await supabase
    .from("saved_events")
    .select("event_id, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .order("event_id", { ascending: false })
    .range(from, to);

  if (savedError) {
    throw new Error("Failed to load saved events.");
  }

  const pagedSavedRows = splitPaginatedRows(savedRows, safePageSize);

  if (pagedSavedRows.rows.length === 0) {
    return {
      events: [],
      hasMore: false,
    };
  }

  const eventIds = pagedSavedRows.rows.map((row) => row.event_id);
  const { data: events, error: eventsError } = await supabase
    .from("events")
    .select(EVENT_CARD_SELECT)
    .in("id", eventIds)
    .eq("is_published", true);

  if (eventsError) {
    throw new Error("Failed to load saved event details.");
  }

  const eventsById = new Map(events.map((event) => [event.id, event]));

  return {
    events: eventIds
      .map((id) => eventsById.get(id))
      .filter((event): event is EventCardSource => Boolean(event)),
    hasMore: pagedSavedRows.hasMore,
  };
}

export async function getMyEvents(
  status: EventParticipationStatus = "interested",
): Promise<EventCardSource[]> {
  const { events } = await getMyEventsPage(status, 1, 50);
  return events;
}

export async function getMyEventsPage(
  status: EventParticipationStatus = "interested",
  page = 1,
  pageSize = 20,
): Promise<PaginatedEventResult<EventCardSource>> {
  const user = await requireUser();
  const { from, to, pageSize: safePageSize } = createPaginationWindow({
    page,
    pageSize,
    defaultPageSize: 20,
    maxPageSize: 40,
  });
  const supabase = await createClient();
  const participantRowsQuery = supabase
    .from("event_participants")
    .select("event_id, created_at")
    .eq("user_id", user.id)
    .eq("status", status)
    .order("created_at", { ascending: false })
    .order("event_id", { ascending: false })
    .range(from, to);

  const { data: participantRowsPage, error: participantRowsPageError } = await participantRowsQuery;

  if (participantRowsPageError) {
    throw new Error("Failed to load your events.");
  }

  const pagedParticipants = splitPaginatedRows(participantRowsPage, safePageSize);

  if (pagedParticipants.rows.length === 0) {
    return {
      events: [],
      hasMore: false,
    };
  }

  const eventIds = pagedParticipants.rows.map((row) => row.event_id);
  const { data: events, error: eventsError } = await supabase
    .from("events")
    .select(EVENT_CARD_SELECT)
    .in("id", eventIds)
    .eq("is_published", true);

  if (eventsError) {
    throw new Error("Failed to load event details.");
  }

  const eventsById = new Map(events.map((event) => [event.id, event]));

  return {
    events: eventIds
      .map((id) => eventsById.get(id))
      .filter((event): event is EventCardSource => Boolean(event)),
    hasMore: pagedParticipants.hasMore,
  };
}

export async function getMyCreatedEvents(limit = 50): Promise<EventCreatedCardSource[]> {
  const { events } = await getMyCreatedEventsPage(1, limit);
  return events;
}

export async function getMyCreatedEventsPage(
  page = 1,
  pageSize = 20,
): Promise<PaginatedEventResult<EventCreatedCardSource>> {
  const user = await requireUser();
  const { from, to, pageSize: safePageSize } = createPaginationWindow({
    page,
    pageSize,
    defaultPageSize: 20,
    maxPageSize: 40,
  });
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("events")
    .select(EVENT_CREATED_CARD_SELECT)
    .eq("created_by", user.id)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, to);

  if (error) {
    throw new Error("Failed to load your created events.");
  }

  const paged = splitPaginatedRows(data, safePageSize);
  return {
    events: paged.rows,
    hasMore: paged.hasMore,
  };
}

export async function getOwnedEventForEdit(eventId: string): Promise<EventEditSource | null> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: event, error } = await supabase
    .from("events")
    .select(EVENT_EDIT_SELECT)
    .eq("id", eventId)
    .maybeSingle();

  if (error) {
    throw new Error("Failed to load event.");
  }

  if (!event || !isEventOwner(event.created_by, user.id)) {
    return null;
  }

  return event;
}

export async function getEventDetail(eventId: string): Promise<{
  event: EventRow | null;
  organizer: OrganizerProfile | null;
  isSaved: boolean;
  isOwner: boolean;
  participationStatus: EventParticipationStatus | null;
}> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .maybeSingle();

  if (eventError) {
    throw new Error("Failed to load event.");
  }

  if (!event) {
    return {
      event: null,
      organizer: null,
      isSaved: false,
      isOwner: false,
      participationStatus: null,
    };
  }

  const isOwner = isEventOwner(event.created_by, user.id);
  if (!event.is_published && !isOwner) {
    return {
      event: null,
      organizer: null,
      isSaved: false,
      isOwner: false,
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

  if (savedResult.error) {
    throw new Error("Failed to load saved event status.");
  }

  if (participantResult.error) {
    throw new Error("Failed to load participation status.");
  }

  return {
    event,
    organizer: organizerResult.data,
    isSaved: Boolean(savedResult.data),
    isOwner,
    participationStatus: participantResult.data?.status ?? null,
  };
}
