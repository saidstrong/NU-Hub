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
          subtitle="Campus events, at a glance."
          actionNode={
            <Link href="/events/my-events" className="wire-link">
              My events
            </Link>
          }
        />
      </section>

      <section className="wire-panel">
        <SectionHeader title="Search" />
        <SearchBar
          placeholder="Search events"
          queryName="q"
          defaultValue=""
          action="/search"
        />
      </section>

      <section className="wire-panel">
        <SectionHeader title="Actions" />
        <div className="wire-action-row">
          <ShellButton label="Create event" href="/events/create" variant="primary" />
          <Link href="/events/list" className="wire-action">
            Event list
          </Link>
        </div>
        <div className="mt-3 flex flex-wrap gap-3">
          <Link href="/events/saved" className="wire-link">
            Saved events
          </Link>
        </div>
      </section>

      <SectionCard
        title="This week on campus"
        subtitle="Featured first, then upcoming."
        actionLabel="View all events"
        actionHref="/events/list"
      >
        {loadError ? <FeedbackBanner tone="error" message={loadError} className="mb-3" /> : null}
        {featuredEvent ? (
          <EventCard event={toEventCardData(featuredEvent)} href={`/events/${featuredEvent.id}`} />
        ) : !loadError ? (
          <EmptyState
            title="No published events yet"
            description="Published campus events will appear here."
            actionLabel="Create event"
            actionHref="/events/create"
          />
        ) : null}
        {upcomingEvents.length > 0 ? (
          <div className="mt-4 border-t border-wire-700 pt-4">
            <p className="mb-3 wire-label">Upcoming</p>
            <div className="wire-list">
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
