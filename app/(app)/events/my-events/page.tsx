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

function parseStatus(value?: string): "interested" | "joined" | "created" {
  if (value === "joined" || value === "created") return value;
  return "interested";
}

export default async function MyEventsPage({ searchParams }: MyEventsPageProps) {
  const { status, message, page: pageParam } = await searchParams;
  const selectedStatus = parseStatus(status);
  const page = parsePageParam(pageParam);
  const activeIndex = selectedStatus === "interested" ? 0 : selectedStatus === "joined" ? 1 : 2;
  const participationLabel =
    selectedStatus === "joined"
      ? formatParticipationLabel("joined")
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

  return (
    <main>
      <TopBar
        title="My Events"
        subtitle="Keep track of interested, joined, and created events"
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
          { label: "Joined", href: buildPageHref("/events/my-events", 1, { status: "joined" }) },
          { label: "Created", href: buildPageHref("/events/my-events", 1, { status: "created" }) },
        ]}
        activeIndex={activeIndex}
      />

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
                    ? "is_published" in event && event.is_published
                      ? "Published"
                      : "Draft"
                    : participationLabel,
              })}
              href={`/events/${event.id}`}
            />
          ))}
        </div>
      ) : null}

      {selectedStatus === "created" && events.length === 0 && !loadError ? (
        <EmptyState
          title="No created events yet"
          description="Create your first event and it will appear here."
          actionLabel="Create event"
          actionHref="/events/create"
        />
      ) : events.length === 0 && !loadError ? (
        <EmptyState
          title={`No ${selectedStatus} events yet`}
          description="When you interact with events, they will appear in this view."
          actionLabel="Browse events"
          actionHref="/events"
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
