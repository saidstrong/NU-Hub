import { EmptyState } from "@/components/ui/EmptyState";
import { FilterRow } from "@/components/ui/FilterRow";
import { EventCard } from "@/components/ui/EventCard";
import { SearchBar } from "@/components/ui/SearchBar";
import { SectionCard } from "@/components/ui/SectionCard";
import { TagChip } from "@/components/ui/TagChip";
import { TopBar } from "@/components/ui/TopBar";
import { eventCategories } from "@/lib/mock-data";
import { getPublishedEvents, toEventCardData } from "@/lib/events/data";

export default async function EventsHomePage() {
  let events: Awaited<ReturnType<typeof getPublishedEvents>> = [];
  let loadError: string | null = null;

  try {
    events = await getPublishedEvents();
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Failed to load events.";
  }

  const featuredEvent = events[0];
  const upcomingEvents = events.slice(1, 5);

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
    </main>
  );
}
