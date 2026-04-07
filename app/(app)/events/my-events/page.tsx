import { EmptyState } from "@/components/ui/EmptyState";
import { EventCard } from "@/components/ui/EventCard";
import { PageNavigation } from "@/components/ui/PageNavigation";
import { TabRow } from "@/components/ui/TabRow";
import { TopBar } from "@/components/ui/TopBar";
import {
  formatParticipationLabel,
  getMyCreatedEventsPage,
  getMyEventsPage,
  toEventCardData,
} from "@/lib/events/data";
import { buildPageHref, parsePageParam } from "@/lib/pagination";

type MyEventsPageProps = {
  searchParams: Promise<{
    status?: string;
    message?: string;
    page?: string;
  }>;
};

const MY_EVENTS_PAGE_SIZE = 12;

function parseStatus(value?: string): "interested" | "going" | "created" {
  if (value === "created") return value;
  if (value === "going" || value === "joined") return "going";
  return "interested";
}

export default async function MyEventsPage({ searchParams }: MyEventsPageProps) {
  const { status, message, page: pageParam } = await searchParams;
  const selectedStatus = parseStatus(status);
  const page = parsePageParam(pageParam);
  const activeIndex = selectedStatus === "interested" ? 0 : selectedStatus === "going" ? 1 : 2;
  const participationLabel =
    selectedStatus === "going"
      ? formatParticipationLabel("going")
      : formatParticipationLabel("interested");

  let events: Array<
    | Awaited<ReturnType<typeof getMyEventsPage>>["events"][number]
    | Awaited<ReturnType<typeof getMyCreatedEventsPage>>["events"][number]
  > = [];
  let hasMore = false;
  let loadError: string | null = null;

  try {
    if (selectedStatus === "created") {
      const pagedEvents = await getMyCreatedEventsPage(page, MY_EVENTS_PAGE_SIZE);
      events = pagedEvents.events;
      hasMore = pagedEvents.hasMore;
    } else {
      const pagedEvents = await getMyEventsPage(selectedStatus, page, MY_EVENTS_PAGE_SIZE);
      events = pagedEvents.events;
      hasMore = pagedEvents.hasMore;
    }
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Failed to load your events.";
  }

  const previousHref = page > 1
    ? buildPageHref("/events/my-events", page - 1, { status: selectedStatus })
    : undefined;
  const nextHref = hasMore
    ? buildPageHref("/events/my-events", page + 1, { status: selectedStatus })
    : undefined;
  const viewSummary = selectedStatus === "interested"
    ? "Events you may attend. Keep track of them here while you decide."
    : selectedStatus === "going"
      ? "Events you plan to attend. Open one to review details or update your RSVP if plans change."
      : "Events you organize. Open one to manage event details, publishing status, and attendee-facing information.";
  const viewCountLabel = events.length === 1
    ? "1 event on this page"
    : `${events.length} events on this page`;
  const emptyStateTitle = selectedStatus === "interested"
    ? "No interested events yet"
    : selectedStatus === "going"
      ? "No planned events yet"
      : "No organized events yet";
  const emptyStateDescription = selectedStatus === "interested"
    ? "Mark an event as Interested to keep it here while you decide whether to attend."
    : selectedStatus === "going"
      ? "Events marked Going stay here so you can keep track of what you plan to attend."
      : "Create an event to start organizing a campus activity from Atrium.";
  const emptyStateActionLabel = selectedStatus === "created" ? "Create event" : "Browse events";
  const emptyStateActionHref = selectedStatus === "created" ? "/events/create" : "/events";

  return (
    <main>
      <TopBar
        title="My Events"
        subtitle="Events you may attend, plan to attend, or organize."
        backHref="/events"
      />
      {message ? (
        <div className="rounded-xl border border-accent/35 bg-accent/10 px-3 py-2 text-[13px] text-wire-100">
          {message}
        </div>
      ) : null}

      <TabRow
        tabs={[
          { label: "Interested", href: buildPageHref("/events/my-events", 1, { status: "interested" }) },
          { label: "Going", href: buildPageHref("/events/my-events", 1, { status: "going" }) },
          { label: "Created", href: buildPageHref("/events/my-events", 1, { status: "created" }) },
        ]}
        activeIndex={activeIndex}
      />

      <section className="wire-panel py-3">
        <p className="wire-label">Participation view</p>
        <p className="mt-1 text-[13px] leading-relaxed text-wire-300">
          {viewSummary}
        </p>
        {!loadError ? (
          <p className="mt-2 text-[12px] font-medium text-wire-200">{viewCountLabel}</p>
        ) : null}
      </section>

      {loadError ? (
        <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-[13px] text-red-200">
          {loadError}
        </div>
      ) : null}

      {events.length > 0 ? (
        <div className="wire-list">
          {events.map((event) => (
            <EventCard
              key={event.id}
              event={toEventCardData(event, {
                status:
                  selectedStatus === "created"
                    ? "is_published" in event
                      ? event.is_hidden
                        ? "Rejected"
                        : event.is_published
                          ? "Published"
                          : "Pending review"
                      : undefined
                    : participationLabel,
              })}
              href={`/events/${event.id}`}
            />
          ))}
        </div>
      ) : null}

      {events.length === 0 && !loadError ? (
        <EmptyState
          title={emptyStateTitle}
          description={emptyStateDescription}
          actionLabel={emptyStateActionLabel}
          actionHref={emptyStateActionHref}
        />
      ) : null}
      <PageNavigation
        previousHref={previousHref}
        nextHref={nextHref}
        previousLabel="Previous page"
        nextLabel="Next page"
      />
    </main>
  );
}
