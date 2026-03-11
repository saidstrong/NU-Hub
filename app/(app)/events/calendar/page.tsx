import { EmptyState } from "@/components/ui/EmptyState";
import { EventCard } from "@/components/ui/EventCard";
import { SectionCard } from "@/components/ui/SectionCard";
import { TopBar } from "@/components/ui/TopBar";
import { getPublishedEvents, toEventCardData } from "@/lib/events/data";

export default async function EventsCalendarPage() {
  let events: Awaited<ReturnType<typeof getPublishedEvents>> = [];
  let loadError: string | null = null;

  try {
    events = await getPublishedEvents(8);
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Failed to load calendar events.";
  }

  return (
    <main>
      <TopBar
        title="Events Calendar"
        subtitle="Calendar shell for monthly and weekly planning"
        backHref="/events"
      />
      {loadError ? (
        <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-[13px] text-red-200">
          {loadError}
        </div>
      ) : null}

      <section className="wire-panel">
        <h3 className="mb-2 text-sm font-semibold text-wire-100">Month / Week Shell</h3>
        <div className="wire-placeholder h-36" />
        <p className="mt-2 wire-meta">Calendar grid is simplified for MVP. Use the list below for upcoming events.</p>
      </section>

      <SectionCard title="Selected Day Events">
        {events.length > 0 ? (
          <div className="wire-list">
            {events.slice(0, 4).map((event) => (
              <EventCard key={event.id} event={toEventCardData(event)} href={`/events/${event.id}`} />
            ))}
          </div>
        ) : !loadError ? (
          <EmptyState
            title="No events available"
            description="Published events will appear here."
            actionLabel="Back to events"
            actionHref="/events"
          />
        ) : null}
      </SectionCard>
    </main>
  );
}
