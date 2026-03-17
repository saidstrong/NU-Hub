import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import { isEventOwner } from "@/lib/events/ownership";
import { formatCampusEventDateRange } from "@/lib/datetime";
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
  is_hidden: boolean;
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

export type PendingEventReviewItem = {
  id: string;
  title: string;
  category: string;
  startsAt: string;
  endsAt: string | null;
  location: string;
  createdAt: string;
  creatorId: string | null;
  creatorName: string;
};

type OrganizerProfile = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "user_id" | "full_name" | "school" | "major" | "year_label"
>;
const EVENT_CARD_SELECT = "id, title, starts_at, ends_at, location, category";
const EVENT_CREATED_CARD_SELECT = `${EVENT_CARD_SELECT}, is_published, is_hidden`;
const EVENT_EDIT_SELECT =
  "id, created_by, title, description, category, starts_at, ends_at, location, is_published";

function isAdminUser(user: Awaited<ReturnType<typeof requireUser>>): boolean {
  const metadata = user.app_metadata;
  if (!metadata || typeof metadata !== "object") {
    return false;
  }

  return (metadata as Record<string, unknown>).role === "admin";
}

export function formatEventDate(startsAt: string, endsAt: string | null): string {
  return formatCampusEventDateRange(startsAt, endsAt);
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
  return status === "going" ? "Going" : "Interested";
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
    .eq("is_hidden", false)
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
    .eq("is_published", true)
    .eq("is_hidden", false);

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
    .eq("is_published", true)
    .eq("is_hidden", false);

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
  rsvpCounts: {
    going: number;
    interested: number;
  };
}> {
  const user = await requireUser();
  const isAdmin = isAdminUser(user);
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
      rsvpCounts: {
        going: 0,
        interested: 0,
      },
    };
  }

  const isOwner = isEventOwner(event.created_by, user.id);
  const isPubliclyVisible = event.is_published && !event.is_hidden;
  if (!isPubliclyVisible && !isOwner && !isAdmin) {
    return {
      event: null,
      organizer: null,
      isSaved: false,
      isOwner: false,
      participationStatus: null,
      rsvpCounts: {
        going: 0,
        interested: 0,
      },
    };
  }

  const [organizerResult, savedResult, participantResult, goingCountResult, interestedCountResult] = await Promise.all([
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
    supabase
      .from("event_participants")
      .select("*", { count: "exact", head: true })
      .eq("event_id", event.id)
      .eq("status", "going"),
    supabase
      .from("event_participants")
      .select("*", { count: "exact", head: true })
      .eq("event_id", event.id)
      .eq("status", "interested"),
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

  if (goingCountResult.error || interestedCountResult.error) {
    throw new Error("Failed to load RSVP counts.");
  }

  return {
    event,
    organizer: organizerResult.data,
    isSaved: Boolean(savedResult.data),
    isOwner,
    participationStatus: participantResult.data?.status ?? null,
    rsvpCounts: {
      going: goingCountResult.count ?? 0,
      interested: interestedCountResult.count ?? 0,
    },
  };
}

export async function getPendingEventsForReview(limit = 50): Promise<PendingEventReviewItem[]> {
  const user = await requireUser();
  if (!isAdminUser(user)) {
    throw new Error("Not authorized to review pending events.");
  }

  const safeLimit = Math.max(1, Math.min(limit, 100));
  const supabase = await createClient();
  const { data: events, error: eventsError } = await supabase
    .from("events")
    .select("id, title, category, starts_at, ends_at, location, created_at, created_by")
    .eq("is_published", false)
    .eq("is_hidden", false)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(safeLimit);

  if (eventsError) {
    throw new Error("Failed to load pending events.");
  }

  const creatorIds = Array.from(
    new Set((events ?? []).map((event) => event.created_by).filter(Boolean)),
  ) as string[];
  const creatorsResult = creatorIds.length > 0
    ? await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", creatorIds)
    : { data: [] as Array<{ user_id: string; full_name: string }>, error: null };

  if (creatorsResult.error) {
    throw new Error("Failed to load pending event creators.");
  }

  const creatorMap = new Map((creatorsResult.data ?? []).map((profile) => [
    profile.user_id,
    profile.full_name?.trim() || "NU student",
  ]));

  return (events ?? []).map((event) => ({
    id: event.id,
    title: event.title,
    category: event.category,
    startsAt: event.starts_at,
    endsAt: event.ends_at,
    location: event.location,
    createdAt: event.created_at,
    creatorId: event.created_by,
    creatorName: event.created_by
      ? (creatorMap.get(event.created_by) ?? "NU student")
      : "NU student",
  }));
}
