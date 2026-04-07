import { EmptyState } from "@/components/ui/EmptyState";
import { EventCard } from "@/components/ui/EventCard";
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
        title="All Events"
        subtitle="Published NU events you can review, save, or join."
        backHref="/events"
      />
      <section className="wire-panel py-3">
        <p className="wire-label">Published events</p>
        <p className="mt-1 text-[13px] leading-relaxed text-wire-300">
          Open an event to review details, check the organizer, and decide whether to save it or RSVP.
        </p>
        {!loadError ? (
          <p className="mt-2 text-[12px] font-medium text-wire-200">
            {events.length} published event{events.length === 1 ? "" : "s"} in this list
          </p>
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
            <EventCard key={event.id} event={toEventCardData(event)} href={`/events/${event.id}`} />
          ))}
        </div>
      ) : !loadError ? (
        <EmptyState
          title="No events published yet"
          description="Published events students can join will appear here once they are available."
          actionLabel="Back to events"
          actionHref="/events"
        />
      ) : null}
    </main>
  );
}
