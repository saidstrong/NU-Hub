import { EmptyState } from "@/components/ui/EmptyState";
import { FilterRow } from "@/components/ui/FilterRow";
import { EventCard } from "@/components/ui/EventCard";
import { PageNavigation } from "@/components/ui/PageNavigation";
import { SearchBar } from "@/components/ui/SearchBar";
import { SectionCard } from "@/components/ui/SectionCard";
import { TagChip } from "@/components/ui/TagChip";
import { TopBar } from "@/components/ui/TopBar";
import { eventCategories } from "@/lib/mock-data";
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
      <TopBar
        title="Events"
        subtitle="Curated academic and student-led campus events"
        actions={[
          { label: "Create", href: "/events/create" },
          { label: "List", href: "/events/list" },
          { label: "Calendar", href: "/events/calendar" },
        ]}
      />

      <SearchBar placeholder="Search events" />

      <section className="wire-panel">
        <p className="wire-section-title mb-1">Browse events</p>
        <p className="mb-3 wire-meta">Plan your week with campus-relevant events across clubs, career, and workshops.</p>
        <div className="mb-3 flex flex-wrap gap-2">
          {eventCategories.map((category, idx) => (
            <TagChip key={category} label={category} active={idx === 0} />
          ))}
        </div>
        <FilterRow filters={["This week", "Campus", "Saved"]} />
      </section>

      <SectionCard title="Featured this week">
        {loadError ? (
          <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-[13px] text-red-200">
            {loadError}
          </div>
        ) : null}
        {featuredEvent ? (
          <EventCard event={toEventCardData(featuredEvent)} href={`/events/${featuredEvent.id}`} />
        ) : !loadError ? (
          <EmptyState
            title="No published events yet"
            description="Curated campus events will appear here as they become available."
          />
        ) : null}
      </SectionCard>

      <SectionCard title="Upcoming on campus" actionLabel="View list" actionHref="/events/list">
        {upcomingEvents.length > 0 ? (
          <div className="wire-list">
            {upcomingEvents.map((event) => (
              <EventCard key={event.id} event={toEventCardData(event)} href={`/events/${event.id}`} />
            ))}
          </div>
        ) : !loadError ? (
          <EmptyState
            title="No additional upcoming events"
            description="Check back soon for more campus activities this week."
          />
        ) : null}
      </SectionCard>

      <PageNavigation
        previousHref={previousHref}
        nextHref={nextHref}
        previousLabel="Previous page"
        nextLabel="Next page"
      />
    </main>
  );
}
