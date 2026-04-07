import { CommunityCard } from "@/components/ui/CommunityCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { EventCard } from "@/components/ui/EventCard";
import { ListingCard } from "@/components/ui/ListingCard";
import { PersonCard } from "@/components/ui/PersonCard";
import { SearchBar } from "@/components/ui/SearchBar";
import { SectionCard } from "@/components/ui/SectionCard";
import { TopBar } from "@/components/ui/TopBar";
import { searchGlobalEntities } from "@/lib/search/data";
import {
  parseSearchQueryParam,
  SEARCH_MIN_QUERY_LENGTH,
  SEARCH_SECTION_LIMIT,
} from "@/lib/validation/search";

type SearchPageProps = {
  searchParams: Promise<{
    q?: string;
  }>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q } = await searchParams;
  const { query, error: queryError } = parseSearchQueryParam(q);
  const canSearch = query.length >= SEARCH_MIN_QUERY_LENGTH;

  let loadError: string | null = null;
  let results: Awaited<ReturnType<typeof searchGlobalEntities>> | null = null;

  if (canSearch) {
    try {
      results = await searchGlobalEntities(query, SEARCH_SECTION_LIMIT);
    } catch (error) {
      loadError = error instanceof Error ? error.message : "Failed to load search results.";
    }
  }

  const hasAnyResults = results
    ? results.listings.length > 0 ||
      results.events.length > 0 ||
      results.people.length > 0 ||
      results.communities.length > 0
    : false;

  return (
    <main>
      <TopBar
        title="Search Across Atrium"
        subtitle="Global search for market listings, events, students, and communities."
        backHref="/home"
      />
      <SearchBar
        placeholder="Search by keyword, name, title, or organization"
        queryName="q"
        defaultValue={q}
        action="/search"
        autoFocus
      />
      {queryError ? (
        <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-[13px] text-red-200">
          {queryError}
        </div>
      ) : null}
      {loadError ? (
        <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-[13px] text-red-200">
          {loadError}
        </div>
      ) : null}

      <section className="wire-panel py-3">
        <p className="wire-label">Global search</p>
        <p className="mt-1 text-[13px] leading-relaxed text-wire-300">
          Search scans the market, events, student profiles, and communities at once. If you want
          to browse one area, use its local page instead.
        </p>
      </section>

      {!q?.trim() ? (
        <EmptyState
          title="Search all of Atrium"
          description="Enter a keyword, event title, community name, student name, or listing term to search across the main campus surfaces."
          actionLabel="Back to home"
          actionHref="/home"
        />
      ) : null}

      {canSearch && results ? (
        <>
          {!hasAnyResults ? (
            <EmptyState
              title="No results found"
              description="Try a broader keyword, a shorter phrase, or return to home to browse by area."
              actionLabel="Back to home"
              actionHref="/home"
            />
          ) : null}

          <SectionCard
            title="Market Matches"
            subtitle="Listings related to your keyword."
          >
            {results.listings.length > 0 ? (
              <div className="wire-list">
                {results.listings.map((listing) => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    href={`/market/item/${listing.id}`}
                  />
                ))}
              </div>
            ) : (
              <p className="wire-meta">No market matches.</p>
            )}
          </SectionCard>

          <SectionCard
            title="Event Matches"
            subtitle="Upcoming or published events related to your keyword."
          >
            {results.events.length > 0 ? (
              <div className="wire-list">
                {results.events.map((event) => (
                  <EventCard key={event.id} event={event} href={`/events/${event.id}`} />
                ))}
              </div>
            ) : (
              <p className="wire-meta">No event matches.</p>
            )}
          </SectionCard>

          <SectionCard
            title="Student Matches"
            subtitle="People related to your keyword."
          >
            {results.people.length > 0 ? (
              <div className="wire-list">
                {results.people.map((person) => (
                  <PersonCard
                    key={person.id}
                    person={person}
                    href={`/connect/people/${person.id}`}
                  />
                ))}
              </div>
            ) : (
              <p className="wire-meta">No student matches.</p>
            )}
          </SectionCard>

          <SectionCard
            title="Community Matches"
            subtitle="Groups and campus units related to your keyword."
          >
            {results.communities.length > 0 ? (
              <div className="wire-list">
                {results.communities.map((community) => (
                  <CommunityCard
                    key={community.id}
                    community={community}
                    href={`/connect/communities/${community.id}`}
                  />
                ))}
              </div>
            ) : (
              <p className="wire-meta">No community matches.</p>
            )}
          </SectionCard>
        </>
      ) : null}
    </main>
  );
}
