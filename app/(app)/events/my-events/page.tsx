import { EmptyState } from "@/components/ui/EmptyState";
import { EventCard } from "@/components/ui/EventCard";
import { TabRow } from "@/components/ui/TabRow";
import { TopBar } from "@/components/ui/TopBar";
import {
  formatParticipationLabel,
  getMyEvents,
  toEventCardData,
} from "@/lib/events/data";

type MyEventsPageProps = {
  searchParams: Promise<{
    status?: string;
  }>;
};

function parseStatus(value?: string): "interested" | "joined" | "created" {
  if (value === "joined" || value === "created") return value;
  return "interested";
}

export default async function MyEventsPage({ searchParams }: MyEventsPageProps) {
  const { status } = await searchParams;
  const selectedStatus = parseStatus(status);
  const activeIndex = selectedStatus === "interested" ? 0 : selectedStatus === "joined" ? 1 : 2;
  const participationLabel =
    selectedStatus === "joined"
      ? formatParticipationLabel("joined")
      : formatParticipationLabel("interested");

  let events: Awaited<ReturnType<typeof getMyEvents>> = [];
  let loadError: string | null = null;

  if (selectedStatus !== "created") {
    try {
      events = await getMyEvents(selectedStatus);
    } catch (error) {
      loadError = error instanceof Error ? error.message : "Failed to load your events.";
    }
  }

  return (
    <main>
      <TopBar
        title="My Events"
        subtitle="Keep track of interested, joined, and created events"
        backHref="/events"
      />

      <TabRow
        tabs={[
          { label: "Interested", href: "/events/my-events?status=interested" },
          { label: "Joined", href: "/events/my-events?status=joined" },
          { label: "Created", href: "/events/my-events?status=created" },
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
              event={toEventCardData(event, { status: participationLabel })}
              href={`/events/${event.id}`}
            />
          ))}
        </div>
      ) : null}

      {selectedStatus === "created" ? (
        <EmptyState
          title="Created events are not enabled yet"
          description="Event creation is outside this MVP slice and will be added later."
          actionLabel="Back to events"
          actionHref="/events"
        />
      ) : events.length === 0 && !loadError ? (
        <EmptyState
          title={`No ${selectedStatus} events yet`}
          description="When you interact with events, they will appear in this view."
          actionLabel="Browse events"
          actionHref="/events"
        />
      ) : null}
    </main>
  );
}
