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
    loadError = error instanceof Error ? error.message : "Failed to load the campus network.";
  }

  return (
    <main>
      <section className="wire-panel">
        <SectionHeader
          title="Connect"
          subtitle="The hub for students, friends, communities, and direct campus conversations."
          actionNode={
            <Link href="/connect/friends" className="wire-link">
              Open friends
            </Link>
          }
        />
        <div className="mt-3">
          <SearchBar
            placeholder="Search students, communities, and shared interests across Atrium"
            queryName="q"
            defaultValue=""
            action="/search"
          />
        </div>
      </section>

      {loadError ? <FeedbackBanner tone="error" message={loadError} /> : null}

      <section className="wire-panel py-4">
        <SectionHeader
          title="Start here"
          subtitle="Use people discovery first, then jump to friends, communities, or messages."
          className="mb-3 pb-3"
        />
        <div className="flex flex-wrap items-center gap-2">
          <ShellButton label="Find students" href="/connect/people" variant="primary" block={false} />
          <Link href="/connect/communities" className="wire-action">
            Open communities
          </Link>
          <Link href="/connect/messages" className="wire-action-compact">
            Friend messages
          </Link>
          <Link href="/connect/my-communities" className="wire-action-compact">
            My communities
          </Link>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard
          title="Students to know"
          subtitle="People around campus you can message, meet, or collaborate with."
          actionLabel="Browse students"
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
              title="No student profiles yet"
              description="Browse People to discover NU student profiles as they become available."
              actionLabel="Browse students"
              actionHref="/connect/people"
            />
          ) : null}
        </SectionCard>

        <SectionCard
          title="Communities to join"
          subtitle="Clubs, circles, and student-led groups coordinating activity on campus."
          actionLabel="Browse communities"
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
              description="Browse Communities to explore groups as organizers open them to the campus network."
              actionLabel="Browse communities"
              actionHref="/connect/communities"
            />
          ) : null}
        </SectionCard>
      </div>
    </main>
  );
}
