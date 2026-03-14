import { EmptyState } from "@/components/ui/EmptyState";
import { PersonCard } from "@/components/ui/PersonCard";
import { SearchBar } from "@/components/ui/SearchBar";
import { SectionCard } from "@/components/ui/SectionCard";
import { TopBar } from "@/components/ui/TopBar";
import { getPeopleDiscovery, toPersonCardData } from "@/lib/connect/data";

export default async function PeopleDiscoveryPage() {
  let people: Awaited<ReturnType<typeof getPeopleDiscovery>> = [];
  let loadError: string | null = null;

  try {
    people = await getPeopleDiscovery(50);
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Failed to load people.";
  }

  return (
    <main>
      <TopBar
        title="People"
        backHref="/connect"
      />
      {loadError ? (
        <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-[13px] text-red-200">
          {loadError}
        </div>
      ) : null}
      <SearchBar placeholder="Find students" />

      <SectionCard title="Students You May Work With">
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
            title="No people found"
            description="Student profiles will appear here after onboarding is completed."
          />
        ) : null}
      </SectionCard>
    </main>
  );
}
