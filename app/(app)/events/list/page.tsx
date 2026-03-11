import { EmptyState } from "@/components/ui/EmptyState";
import { EventCard } from "@/components/ui/EventCard";
import { FilterRow } from "@/components/ui/FilterRow";
import { TopBar } from "@/components/ui/TopBar";
import { getPublishedEvents, toEventCardData } from "@/lib/events/data";

export default async function EventsListPage() {
  let events: Awaited<ReturnType<typeof getPublishedEvents>> = [];
  let loadError: string | null = null;

  try {
    events = await getPublishedEvents(50);
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Failed to load events.";
  }

  return (
    <main>
      <TopBar
        title="Events List"
        subtitle="Browse all events with simple filters"
        backHref="/events"
      />
      {loadError ? (
        <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-[13px] text-red-200">
          {loadError}
        </div>
      ) : null}
      <FilterRow filters={["This week", "Category", "Location", "Time"]} />
      {events.length > 0 ? (
        <div className="wire-list">
          {events.map((event) => (
            <EventCard key={event.id} event={toEventCardData(event)} href={`/events/${event.id}`} />
          ))}
        </div>
      ) : !loadError ? (
        <EmptyState
          title="No events published yet"
          description="Published events will appear in this list."
          actionLabel="Back to events"
          actionHref="/events"
        />
      ) : null}
    </main>
  );
}
