import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { FeedbackBanner } from "@/components/ui/FeedbackBanner";
import { EventCard } from "@/components/ui/EventCard";
import { PageNavigation } from "@/components/ui/PageNavigation";
import { SearchBar } from "@/components/ui/SearchBar";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { ShellButton } from "@/components/ui/ShellButton";
import { getPublishedEventsPage, toEventCardData } from "@/lib/events/data";
import { buildPageHref, parsePageParam } from "@/lib/pagination";

type EventsHomePageProps = {
  searchParams: Promise<{
    page?: string;
  }>;
};

const EVENTS_PAGE_SIZE = 5;

export default async function EventsHomePage({ searchParams }: EventsHomePageProps) {
  const { page: pageParam } = await searchParams;
  const page = parsePageParam(pageParam);

  let events: Awaited<ReturnType<typeof getPublishedEventsPage>>["events"] = [];
  let hasMore = false;
  let loadError: string | null = null;

  try {
    const pagedEvents = await getPublishedEventsPage(page, EVENTS_PAGE_SIZE);
    events = pagedEvents.events;
    hasMore = pagedEvents.hasMore;
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Failed to load events.";
  }

  const featuredEvent = events[0];
  const upcomingEvents = events.slice(1, 5);
  const previousHref = page > 1 ? buildPageHref("/events", page - 1) : undefined;
  const nextHref = hasMore ? buildPageHref("/events", page + 1) : undefined;

  return (
    <main>
      <section className="wire-panel">
        <SectionHeader
          title="Events"
          actionNode={
            <Link href="/events/my-events" className="wire-link">
              My events
            </Link>
          }
        />
        <div className="mt-3">
          <SearchBar
            placeholder="Search events"
            queryName="q"
            defaultValue=""
            action="/search"
          />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <ShellButton label="Create event" href="/events/create" variant="primary" block={false} />
          <Link href="/events/list" className="wire-action-compact">
            See all
          </Link>
          <Link href="/events/saved" className="wire-action-compact">
            Saved
          </Link>
        </div>
      </section>

      <SectionCard
        title="Upcoming events"
        subtitle="Published events ordered by start time."
        actionLabel="See all"
        actionHref="/events/list"
      >
        {loadError ? <FeedbackBanner tone="error" message={loadError} className="mb-3" /> : null}
        {!loadError && events.length > 0 ? (
          <p className="mb-3 text-[12px] text-wire-300">
            {events.length} event{events.length === 1 ? "" : "s"} in this view
          </p>
        ) : null}
        {featuredEvent ? (
          <EventCard event={toEventCardData(featuredEvent)} href={`/events/${featuredEvent.id}`} />
        ) : !loadError ? (
          <EmptyState
            title="No upcoming events right now"
            description="Check back soon or publish a new campus event."
            actionLabel="Create event"
            actionHref="/events/create"
          />
        ) : null}
        {upcomingEvents.length > 0 ? (
          <div className="mt-5 border-t border-wire-700 pt-4">
            <p className="mb-3 wire-label">Next Up</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {upcomingEvents.map((event) => (
                <EventCard key={event.id} event={toEventCardData(event)} href={`/events/${event.id}`} />
              ))}
            </div>
          </div>
        ) : featuredEvent && !loadError ? (
          <p className="wire-inline-empty mt-4">No additional upcoming events yet.</p>
        ) : null}
      </SectionCard>

      <div className="mt-[-6px]">
        <PageNavigation
          previousHref={previousHref}
          nextHref={nextHref}
          previousLabel="Previous page"
          nextLabel="Next page"
        />
      </div>
    </main>
  );
}
