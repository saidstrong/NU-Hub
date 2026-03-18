import Link from "next/link";
import { CommunityCard } from "@/components/ui/CommunityCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { FeedbackBanner } from "@/components/ui/FeedbackBanner";
import { PersonCard } from "@/components/ui/PersonCard";
import { SearchBar } from "@/components/ui/SearchBar";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { ShellButton } from "@/components/ui/ShellButton";
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
          actionNode={
            <Link href="/connect/friends" className="wire-link">
              Friends
            </Link>
          }
        />
        <div className="mt-3">
          <SearchBar
            placeholder="Search students and communities"
            queryName="q"
            defaultValue=""
            action="/search"
          />
        </div>
      </section>

      {loadError ? <FeedbackBanner tone="error" message={loadError} /> : null}

      <section className="wire-panel py-4">
        <div className="flex flex-wrap items-center gap-2">
          <ShellButton label="Find people" href="/connect/people" variant="primary" block={false} />
          <Link href="/connect/communities" className="wire-action">
            Communities
          </Link>
          <Link href="/connect/messages" className="wire-action-compact">
            Messages
          </Link>
          <Link href="/connect/my-communities" className="wire-action-compact">
            My communities
          </Link>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard
          title="Suggested people"
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
              description="Student communities will appear here as they become available."
            />
          ) : null}
        </SectionCard>
      </div>
    </main>
  );
}
