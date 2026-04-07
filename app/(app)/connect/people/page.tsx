import { EmptyState } from "@/components/ui/EmptyState";
import { PersonCard } from "@/components/ui/PersonCard";
import { SectionCard } from "@/components/ui/SectionCard";
import { TopBar } from "@/components/ui/TopBar";
import { getPeopleDiscovery, toPersonCardData } from "@/lib/connect/data";

export default async function PeopleDiscoveryPage() {
  let people: Awaited<ReturnType<typeof getPeopleDiscovery>> = [];
  let loadError: string | null = null;

  try {
    people = await getPeopleDiscovery(500);
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Failed to load people.";
  }

  return (
    <main>
      <TopBar
        title="People"
        subtitle="Browse NU student profiles and open one when you want more context before connecting."
        backHref="/connect"
      />
      {loadError ? (
        <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-[13px] text-red-200">
          {loadError}
        </div>
      ) : null}

      <section className="wire-panel py-3">
        <p className="wire-label">People directory</p>
        <p className="mt-1 text-[13px] leading-relaxed text-wire-300">
          Profiles shown here are completed student profiles across NU. Open one to review academic
          context, identity, and trust cues in more detail.
        </p>
      </section>

      <SectionCard
        title="NU students"
        subtitle="Browse completed student profiles across the campus network."
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
            title="No student profiles available yet"
            description="Completed student profiles will appear here after onboarding is finished."
            actionLabel="Back to connect"
            actionHref="/connect"
          />
        ) : null}
      </SectionCard>
    </main>
  );
}
