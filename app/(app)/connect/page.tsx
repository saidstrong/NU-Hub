import { CommunityCard } from "@/components/ui/CommunityCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { PersonCard } from "@/components/ui/PersonCard";
import { SearchBar } from "@/components/ui/SearchBar";
import { SectionCard } from "@/components/ui/SectionCard";
import { TagChip } from "@/components/ui/TagChip";
import { TopBar } from "@/components/ui/TopBar";
import {
  lookingForChips,
} from "@/lib/mock-data";
import {
  getCommunities,
  getPeopleDiscovery,
  toCommunityCardData,
  toPersonCardData,
} from "@/lib/connect/data";

export default async function ConnectHomePage() {
  let people: Awaited<ReturnType<typeof getPeopleDiscovery>> = [];
  let communities: Awaited<ReturnType<typeof getCommunities>> = [];
  let loadError: string | null = null;

  try {
    [people, communities] = await Promise.all([getPeopleDiscovery(3), getCommunities(3)]);
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Failed to load connect discovery.";
  }

  return (
    <main>
      <TopBar
        title="Connect"
        subtitle="Find peers, collaborators, and student communities"
        actions={[
          { label: "People", href: "/connect/people" },
          { label: "Communities", href: "/connect/communities" },
        ]}
      />
      {loadError ? (
        <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-[13px] text-red-200">
          {loadError}
        </div>
      ) : null}

      <SearchBar placeholder="Search students and communities" />

      <section className="wire-panel">
        <p className="wire-section-title mb-2">Discovery focus</p>
        <p className="mb-3 wire-meta">
          Explore people and communities aligned with your study goals, projects, and interests.
        </p>
        <div className="flex flex-wrap gap-2">
          {lookingForChips.map((chip, idx) => (
            <TagChip key={chip} label={chip} active={idx === 0} />
          ))}
        </div>
      </section>

      <SectionCard title="People for study and projects" actionLabel="See all" actionHref="/connect/people">
        <p className="mb-3 wire-meta">
          Student profiles with clear academic context and collaboration intent.
        </p>
        {people.length > 0 ? (
          <div className="wire-list">
            {people.map((person) => (
              <PersonCard
                key={person.user_id}
                person={toPersonCardData(person)}
                href={`/connect/people/${person.user_id}`}
              />
            ))}
          </div>
        ) : !loadError ? (
          <EmptyState
            title="No people discovered yet"
            description="Profiles with completed onboarding will appear here."
          />
        ) : null}
      </SectionCard>

      <SectionCard
        title="Communities to join"
        actionLabel="See all"
        actionHref="/connect/communities"
      >
        <p className="mb-3 wire-meta">
          Campus circles for study support, project work, and student-led initiatives.
        </p>
        {communities.length > 0 ? (
          <div className="wire-list">
            {communities.map((entry) => (
              <CommunityCard
                key={entry.community.id}
                community={toCommunityCardData(entry.community, entry.memberCount)}
                href={`/connect/communities/${entry.community.id}`}
              />
            ))}
          </div>
        ) : !loadError ? (
          <EmptyState
            title="No communities yet"
            description="Student communities will appear here once published."
          />
        ) : null}
      </SectionCard>
    </main>
  );
}
