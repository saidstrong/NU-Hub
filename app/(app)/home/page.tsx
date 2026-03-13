import { CommunityCard } from "@/components/ui/CommunityCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { EventCard } from "@/components/ui/EventCard";
import { ListingCard } from "@/components/ui/ListingCard";
import { PersonCard } from "@/components/ui/PersonCard";
import { QuickAccessGrid } from "@/components/ui/QuickAccessGrid";
import { SearchBar } from "@/components/ui/SearchBar";
import { SectionCard } from "@/components/ui/SectionCard";
import { TopBar } from "@/components/ui/TopBar";
import {
  getCommunities,
  getPeopleDiscovery,
  toCommunityCardData,
  toPersonCardData,
} from "@/lib/connect/data";
import { getPublishedEvents, toEventCardData } from "@/lib/events/data";
import { getActiveListings, toListingCardData } from "@/lib/market/data";

export default async function HomePage() {
  let listings: Awaited<ReturnType<typeof getActiveListings>> = [];
  let events: Awaited<ReturnType<typeof getPublishedEvents>> = [];
  let people: Awaited<ReturnType<typeof getPeopleDiscovery>> = [];
  let communities: Awaited<ReturnType<typeof getCommunities>> = [];
  let loadError: string | null = null;

  try {
    [listings, events, people, communities] = await Promise.all([
      getActiveListings(2),
      getPublishedEvents(2),
      getPeopleDiscovery(1),
      getCommunities(1),
    ]);
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Failed to load home feed.";
  }

  return (
    <main>
      <TopBar
        title="NU Atrium"
        subtitle="Marketplace, events, and campus collaboration in one place"
        actions={[{ label: "Search", href: "/search" }]}
      />
      {loadError ? (
        <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-[13px] text-red-200">
          {loadError}
        </div>
      ) : null}

      <SearchBar
        placeholder="Search market, events, people, communities"
        queryName="q"
        defaultValue=""
        action="/search"
      />

      <section className="wire-panel">
        <p className="wire-label mb-3">Quick Access</p>
        <QuickAccessGrid
          columns={2}
          items={[
            { label: "Market", href: "/market" },
            { label: "Events", href: "/events" },
            { label: "Connect", href: "/connect" },
            { label: "Campus", href: "/campus" },
          ]}
        />
      </section>

      <SectionCard title="Featured in Market" actionLabel="See all" actionHref="/market">
        <p className="mb-3 wire-meta">Practical listings posted by NU students this week.</p>
        {listings.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {listings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={toListingCardData(listing)}
                href={`/market/item/${listing.id}`}
              />
            ))}
          </div>
        ) : !loadError ? (
          <EmptyState
            title="No listings yet"
            description="Published market listings will appear here."
            actionLabel="Browse market"
            actionHref="/market"
          />
        ) : null}
      </SectionCard>

      <SectionCard title="Upcoming on Campus" actionLabel="See all" actionHref="/events">
        <p className="mb-3 wire-meta">Curated events relevant to student life and projects.</p>
        {events.length > 0 ? (
          <div className="wire-list">
            {events.map((event) => (
              <EventCard key={event.id} event={toEventCardData(event)} href={`/events/${event.id}`} />
            ))}
          </div>
        ) : !loadError ? (
          <EmptyState
            title="No upcoming events"
            description="Published campus events will appear here."
            actionLabel="Browse events"
            actionHref="/events"
          />
        ) : null}
      </SectionCard>

      <SectionCard
        title="People and Communities"
        actionLabel="See all"
        actionHref="/connect"
      >
        <p className="mb-3 wire-meta">
          Find peers and campus circles aligned with your goals and interests.
        </p>
        {people.length > 0 || communities.length > 0 ? (
          <div className="wire-list">
            {people[0] ? (
              <PersonCard
                person={toPersonCardData(people[0])}
                href={`/connect/people/${people[0].user_id}`}
              />
            ) : null}
            {communities[0] ? (
              <CommunityCard
                community={toCommunityCardData(communities[0].community, communities[0].memberCount)}
                href={`/connect/communities/${communities[0].community.id}`}
              />
            ) : null}
          </div>
        ) : !loadError ? (
          <EmptyState
            title="No people or communities yet"
            description="Connect discovery will appear here as students join."
            actionLabel="Open connect"
            actionHref="/connect"
          />
        ) : null}
      </SectionCard>
    </main>
  );
}
