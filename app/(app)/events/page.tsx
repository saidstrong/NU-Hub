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
          subtitle="Browse upcoming NU events, save what you want to revisit, and keep attendance plans in one place."
          actionNode={
            <Link href="/events/my-events" className="wire-link">
              My events
            </Link>
          }
        />
        <div className="mt-3">
          <SearchBar
            placeholder="Search across Atrium"
            queryName="q"
            defaultValue=""
            action="/search"
          />
        </div>
        <p className="mt-3 text-[13px] leading-relaxed text-wire-300">
          The search bar opens global search. Use the lists below when you want to browse upcoming
          events.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <ShellButton label="Create event" href="/events/create" variant="primary" block={false} />
          <Link href="/events/list" className="wire-action-compact">
            All events
          </Link>
          <Link href="/events/saved" className="wire-action-compact">
            Saved events
          </Link>
        </div>
        <section className="mt-4 rounded-xl border border-wire-700 bg-wire-900/70 px-3 py-3">
          <p className="wire-label">Participation flow</p>
          <p className="mt-1 text-[13px] leading-relaxed text-wire-300">
            Browse upcoming events here, save the ones you want to revisit, and use My Events to
            track what you may attend, plan to attend, or organize.
          </p>
        </section>
      </section>

      <SectionCard
        title="Upcoming events"
        subtitle="Published NU events you can open, save, and RSVP to."
        actionLabel="All events"
        actionHref="/events/list"
      >
        {loadError ? <FeedbackBanner tone="error" message={loadError} className="mb-3" /> : null}
        {!loadError && events.length > 0 ? (
          <p className="mb-3 text-[12px] text-wire-300">
            {events.length} published event{events.length === 1 ? "" : "s"} in this view
          </p>
        ) : null}
        {featuredEvent ? (
          <EventCard event={toEventCardData(featuredEvent)} href={`/events/${featuredEvent.id}`} />
        ) : !loadError ? (
          <EmptyState
            title="No upcoming events right now"
            description="Published events students can join will appear here. You can still publish one students can save and RSVP to."
            actionLabel="Create event"
            actionHref="/events/create"
          />
        ) : null}
        {upcomingEvents.length > 0 ? (
          <div className="mt-5 border-t border-wire-700 pt-4">
            <p className="mb-3 wire-label">More upcoming events</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {upcomingEvents.map((event) => (
                <EventCard key={event.id} event={toEventCardData(event)} href={`/events/${event.id}`} />
              ))}
            </div>
          </div>
        ) : featuredEvent && !loadError ? (
          <p className="wire-inline-empty mt-4">No more upcoming events in this view yet.</p>
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
