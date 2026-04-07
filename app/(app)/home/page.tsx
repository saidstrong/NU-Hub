import Link from "next/link";
import {
  Briefcase,
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
    loadError = error instanceof Error ? error.message : "Failed to load the campus overview.";
  }

  return (
    <main>
      <section className="wire-panel">
        <SectionHeader
          title="NU Atrium"
          subtitle="Your starting point for student exchange, events, connections, opportunities, and campus essentials."
          actionNode={
            <Link href="/profile" className="wire-link">
              Open profile
            </Link>
          }
        />
        <div className="mt-3">
          <SearchBar
            placeholder="Search across market, events, students, communities, and more"
            queryName="q"
            defaultValue=""
            action="/search"
          />
        </div>
      </section>

      {loadError ? <FeedbackBanner tone="error" message={loadError} /> : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard
          title="Market right now"
          subtitle="Recent student listings worth checking first."
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
              title="No market listings yet"
              description="Open Market to browse the latest student listings as they start appearing."
              actionLabel="Open market"
              actionHref="/market"
            />
          ) : null}
        </SectionCard>

        <SectionCard
          title="Events coming up"
          subtitle="Published events students can review, save, or join."
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
              description="Open Events to browse published campus activity as new events are scheduled."
              actionLabel="Open events"
              actionHref="/events"
            />
          ) : null}
        </SectionCard>
      </div>

      <section className="wire-panel">
        <SectionHeader
          title="Main destinations"
          subtitle="Jump straight into the parts of Atrium students use most."
        />
        <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-5">
          <Link
            href="/market"
            className="wire-card wire-hover flex min-h-[90px] flex-col justify-between rounded-[var(--radius-card)] p-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
          >
            <ShoppingBag className="h-4 w-4 text-wire-100" aria-hidden="true" />
            <div>
              <p className="text-[14px] font-semibold text-wire-100">Market</p>
              <p className="text-[12px] text-wire-300">Student-to-student listings</p>
            </div>
          </Link>
          <Link
            href="/events"
            className="wire-card wire-hover flex min-h-[90px] flex-col justify-between rounded-[var(--radius-card)] p-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
          >
            <CalendarDays className="h-4 w-4 text-wire-100" aria-hidden="true" />
            <div>
              <p className="text-[14px] font-semibold text-wire-100">Events</p>
              <p className="text-[12px] text-wire-300">Join campus activity</p>
            </div>
          </Link>
          <Link
            href="/connect"
            className="wire-card wire-hover flex min-h-[90px] flex-col justify-between rounded-[var(--radius-card)] p-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
          >
            <Users className="h-4 w-4 text-wire-100" aria-hidden="true" />
            <div>
              <p className="text-[14px] font-semibold text-wire-100">Connect</p>
              <p className="text-[12px] text-wire-300">People and communities</p>
            </div>
          </Link>
          <Link
            href="/jobs"
            className="wire-card wire-hover flex min-h-[90px] flex-col justify-between rounded-[var(--radius-card)] p-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
          >
            <Briefcase className="h-4 w-4 text-wire-100" aria-hidden="true" />
            <div>
              <p className="text-[14px] font-semibold text-wire-100">Jobs</p>
              <p className="text-[12px] text-wire-300">Campus opportunities</p>
            </div>
          </Link>
          <Link
            href="/campus"
            className="wire-card wire-hover flex min-h-[90px] flex-col justify-between rounded-[var(--radius-card)] p-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
          >
            <Compass className="h-4 w-4 text-wire-100" aria-hidden="true" />
            <div>
              <p className="text-[14px] font-semibold text-wire-100">Campus</p>
              <p className="text-[12px] text-wire-300">Reliable info and services</p>
            </div>
          </Link>
        </div>
      </section>

      <SectionCard
        title="People and communities"
        subtitle="Find classmates, organizers, and campus groups to connect with."
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
          </div>
        ) : !loadError ? (
          <EmptyState
            title="No people or communities to show yet"
            description="Open Connect to browse student profiles and campus communities across NU."
            actionLabel="Open connect"
            actionHref="/connect"
          />
        ) : null}
      </SectionCard>
    </main>
  );
}
