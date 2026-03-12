import { EmptyState } from "@/components/ui/EmptyState";
import { EventCard } from "@/components/ui/EventCard";
import { PageNavigation } from "@/components/ui/PageNavigation";
import { TopBar } from "@/components/ui/TopBar";
import { toggleSavedEventAction } from "@/lib/events/actions";
import { getSavedEventsPage, toEventCardData } from "@/lib/events/data";
import { buildPageHref, parsePageParam } from "@/lib/pagination";

type SavedEventsPageProps = {
  searchParams: Promise<{
    page?: string;
  }>;
};

const SAVED_EVENTS_PAGE_SIZE = 12;

export default async function SavedEventsPage({ searchParams }: SavedEventsPageProps) {
  const { page: pageParam } = await searchParams;
  const page = parsePageParam(pageParam);

  let events: Awaited<ReturnType<typeof getSavedEventsPage>>["events"] = [];
  let hasMore = false;
  let loadError: string | null = null;

  try {
    const pagedEvents = await getSavedEventsPage(page, SAVED_EVENTS_PAGE_SIZE);
    events = pagedEvents.events;
    hasMore = pagedEvents.hasMore;
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Failed to load saved events.";
  }

  const previousHref = page > 1 ? buildPageHref("/events/saved", page - 1) : undefined;
  const nextHref = hasMore ? buildPageHref("/events/saved", page + 1) : undefined;
  const currentPageHref = buildPageHref("/events/saved", page);

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
                <input type="hidden" name="redirectTo" value={currentPageHref} />
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
      <PageNavigation
        previousHref={previousHref}
        nextHref={nextHref}
        previousLabel="Previous page"
        nextLabel="Next page"
      />
    </main>
  );
}
