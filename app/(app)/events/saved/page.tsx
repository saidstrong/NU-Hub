import { EmptyState } from "@/components/ui/EmptyState";
import { EventCard } from "@/components/ui/EventCard";
import { TopBar } from "@/components/ui/TopBar";
import { toggleSavedEventAction } from "@/lib/events/actions";
import { getSavedEvents, toEventCardData } from "@/lib/events/data";

export default async function SavedEventsPage() {
  let events: Awaited<ReturnType<typeof getSavedEvents>> = [];
  let loadError: string | null = null;

  try {
    events = await getSavedEvents();
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Failed to load saved events.";
  }

  return (
    <main>
      <TopBar
        title="Saved Events"
        subtitle="Events you want to revisit and track"
        backHref="/events"
      />
      {loadError ? (
        <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-[13px] text-red-200">
          {loadError}
        </div>
      ) : null}

      {events.length > 0 ? (
        <div className="wire-list">
          {events.map((event) => (
            <div key={event.id}>
              <EventCard event={toEventCardData(event)} href={`/events/${event.id}`} />
              <form action={toggleSavedEventAction} className="mt-2">
                <input type="hidden" name="eventId" value={event.id} />
                <input type="hidden" name="redirectTo" value="/events/saved" />
                <button type="submit" className="wire-action w-full text-[12px]">
                  Remove from saved
                </button>
              </form>
            </div>
          ))}
        </div>
      ) : !loadError ? (
        <EmptyState
          title="No saved events"
          description="Saved events will appear here as soon as you add them."
          actionLabel="Browse events"
          actionHref="/events"
        />
      ) : null}
    </main>
  );
}
