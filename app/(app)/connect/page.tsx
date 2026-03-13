import Link from "next/link";
import { CommunityCard } from "@/components/ui/CommunityCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { FeedbackBanner } from "@/components/ui/FeedbackBanner";
import { PersonCard } from "@/components/ui/PersonCard";
import { SearchBar } from "@/components/ui/SearchBar";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { ShellButton } from "@/components/ui/ShellButton";
import { TagChip } from "@/components/ui/TagChip";
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
      <section className="wire-panel">
        <SectionHeader
          title="Connect"
          subtitle="Find the right people and communities for study, projects, and campus momentum."
          actionNode={
            <Link href="/connect/friends" className="wire-link">
              Friends
            </Link>
          }
        />
        <p className="wire-meta">
          Discovery first: identify aligned peers, then join circles that help you move faster.
        </p>
      </section>

      {loadError ? <FeedbackBanner tone="error" message={loadError} /> : null}

      <section className="wire-panel">
        <SectionHeader
          title="Search"
          subtitle="Look up students and communities with one query."
        />
        <SearchBar
          placeholder="Search students and communities"
          queryName="q"
          defaultValue=""
          action="/search"
        />
      </section>

      <section className="wire-panel">
        <SectionHeader
          title="Discovery focus"
          subtitle="Keep filters lightweight and focus on strong identity signals."
        />
        <p className="mb-3 wire-meta">
          Explore people and communities aligned with your study goals, projects, and interests.
        </p>
        <div className="flex flex-wrap gap-2">
          {lookingForChips.map((chip, idx) => (
            <TagChip key={chip} label={chip} active={idx === 0} tone="status" />
          ))}
        </div>
      </section>

      <section className="wire-panel">
        <SectionHeader
          title="Actions"
          subtitle="Start with people, then expand into communities and messages."
        />
        <div className="wire-action-row">
          <ShellButton label="Find people" href="/connect/people" variant="primary" />
          <Link href="/connect/communities" className="wire-action">
            Communities
          </Link>
        </div>
        <div className="mt-3 flex flex-wrap gap-3">
          <Link href="/connect/messages" className="wire-link">
            Messages
          </Link>
          <Link href="/connect/my-communities" className="wire-link">
            My communities
          </Link>
        </div>
      </section>

      <SectionCard
        title="Suggested people"
        subtitle="Students with clear academic context and collaboration intent."
        actionLabel="See all"
        actionHref="/connect/people"
      >
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
        title="Suggested communities"
        subtitle="Campus circles for project work, study support, and student-led initiatives."
        actionLabel="See all"
        actionHref="/connect/communities"
      >
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
