import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Compass,
  ShoppingBag,
  Users,
} from "lucide-react";
import { CommunityCard } from "@/components/ui/CommunityCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { EventCard } from "@/components/ui/EventCard";
import { FeedbackBanner } from "@/components/ui/FeedbackBanner";
import { ListingCard } from "@/components/ui/ListingCard";
import { PersonCard } from "@/components/ui/PersonCard";
import { SearchBar } from "@/components/ui/SearchBar";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { SectionCard } from "@/components/ui/SectionCard";
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
      <section className="wire-panel">
        <SectionHeader
          title="NU Atrium"
          actionNode={
            <Link href="/profile" className="wire-link">
              Profile
            </Link>
          }
        />
        <div className="mt-3">
          <SearchBar
            placeholder="Search market, events, people, communities"
            queryName="q"
            defaultValue=""
            action="/search"
          />
        </div>
      </section>

      {loadError ? <FeedbackBanner tone="error" message={loadError} /> : null}

      <section className="wire-panel">
        <SectionHeader title="Quick access" />
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <Link
            href="/market"
            className="wire-card wire-hover flex min-h-[108px] flex-col justify-between rounded-[var(--radius-card)] p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
          >
            <ShoppingBag className="h-5 w-5 text-wire-100" aria-hidden="true" />
            <div>
              <p className="text-[15px] font-semibold text-wire-100">Market</p>
              <p className="wire-meta">Buy and sell essentials</p>
            </div>
          </Link>
          <Link
            href="/events"
            className="wire-card wire-hover flex min-h-[108px] flex-col justify-between rounded-[var(--radius-card)] p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
          >
            <CalendarDays className="h-5 w-5 text-wire-100" aria-hidden="true" />
            <div>
              <p className="text-[15px] font-semibold text-wire-100">Events</p>
              <p className="wire-meta">Plan your week</p>
            </div>
          </Link>
          <Link
            href="/connect"
            className="wire-card wire-hover flex min-h-[108px] flex-col justify-between rounded-[var(--radius-card)] p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
          >
            <Users className="h-5 w-5 text-wire-100" aria-hidden="true" />
            <div>
              <p className="text-[15px] font-semibold text-wire-100">Connect</p>
              <p className="wire-meta">Find peers and groups</p>
            </div>
          </Link>
          <Link
            href="/campus"
            className="wire-card wire-hover flex min-h-[108px] flex-col justify-between rounded-[var(--radius-card)] p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
          >
            <Compass className="h-5 w-5 text-wire-100" aria-hidden="true" />
            <div>
              <p className="text-[15px] font-semibold text-wire-100">Campus</p>
              <p className="wire-meta">Services and contacts</p>
            </div>
          </Link>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard
          title="Featured listings"
          actionLabel="Open market"
          actionHref="/market"
        >
          {listings.length > 0 ? (
            <div className="wire-list">
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
            actionLabel="Open market"
            actionHref="/market"
          />
          ) : null}
        </SectionCard>

        <SectionCard
          title="Upcoming events"
          actionLabel="Open events"
          actionHref="/events"
        >
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
      </div>

      <SectionCard
        title="Suggested people & communities"
        actionLabel="Open connect"
        actionHref="/connect"
      >
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
            <Link href="/connect" className="wire-link inline-flex w-fit gap-1.5">
              See more suggestions
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
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
