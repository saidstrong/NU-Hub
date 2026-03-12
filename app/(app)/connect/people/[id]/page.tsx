import { EmptyState } from "@/components/ui/EmptyState";
import { FormSection } from "@/components/ui/FormSection";
import { ProfileHeader } from "@/components/ui/ProfileHeader";
import { TagChip } from "@/components/ui/TagChip";
import { TopBar } from "@/components/ui/TopBar";
import { notFound } from "next/navigation";
import { getPersonProfile, toPersonCardData } from "@/lib/connect/data";
import { toPublicStorageUrl } from "@/lib/validation/media";
import { isUuid } from "@/lib/validation/uuid";

type PersonProfilePageProps = {
  params: Promise<{ id: string }>;
};

export default async function PersonProfilePage({ params }: PersonProfilePageProps) {
  const { id } = await params;

  if (!isUuid(id)) {
    notFound();
  }

  let person = null as Awaited<ReturnType<typeof getPersonProfile>>;
  let loadError: string | null = null;

  try {
    person = await getPersonProfile(id);
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Failed to load student profile.";
  }

  if (!person) {
    return (
      <main>
        <TopBar
          title="Student Profile"
          subtitle="Campus identity and collaboration context"
          backHref="/connect/people"
        />
        {loadError ? (
          <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-[13px] text-red-200">
            {loadError}
          </div>
        ) : null}
        <EmptyState
          title="Profile not available"
          description="This profile may be incomplete or unavailable."
          actionLabel="Back to people"
          actionHref="/connect/people"
        />
      </main>
    );
  }

  const personCard = toPersonCardData(person);
  const subtitle = `${personCard.major} - ${personCard.year}`;
  const avatarUrl = toPublicStorageUrl("avatars", person.avatar_path);
  const links =
    person.links && typeof person.links === "object" && !Array.isArray(person.links)
      ? (person.links as Record<string, unknown>)
      : {};

  return (
    <main>
      <TopBar
        title="Student Profile"
        subtitle="Campus identity and collaboration context"
        backHref="/connect/people"
      />
      <ProfileHeader
        name={personCard.name}
        subtitle={subtitle}
        tags={personCard.interests}
        contextLabel="Campus profile"
        avatarUrl={avatarUrl}
      />

      <FormSection title="Bio" description="Snapshot of academic and collaboration context.">
        <p className="text-[13px] leading-relaxed text-wire-200">
          {person.bio || "No bio provided yet."}
        </p>
      </FormSection>

      <FormSection title="Looking for" description="Current collaboration intent.">
        <div className="flex flex-wrap gap-2">
          {person.looking_for.length > 0 ? (
            person.looking_for.map((entry) => <TagChip key={entry} label={entry} />)
          ) : (
            <div className="rounded-xl border border-dashed border-wire-600 bg-wire-900/60 px-3 py-2 text-[13px] text-wire-300">
              No collaboration preferences shared.
            </div>
          )}
        </div>
      </FormSection>

      <FormSection title="Goals" description="Academic or project goals shared by this student.">
        {person.goals.length > 0 ? (
          <div className="space-y-2">
            {person.goals.map((goal) => (
              <div
                key={goal}
                className="rounded-xl border border-wire-700 bg-wire-800 px-3 py-2 text-[13px] text-wire-200"
              >
                {goal}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[13px] text-wire-300">No goals shared yet.</p>
        )}
      </FormSection>

      <FormSection title="Professional context (optional)">
        <div>
          <p className="mb-2 wire-meta">Skills</p>
          <div className="flex flex-wrap gap-2">
            {person.skills.length > 0 ? (
              person.skills.map((skill) => <TagChip key={skill} label={skill} />)
            ) : (
              <p className="text-[13px] text-wire-300">No skills listed.</p>
            )}
          </div>
        </div>
        <div className="border-t border-wire-700 pt-3">
          <p className="mb-2 wire-meta">Links</p>
          <div className="space-y-1 text-[12px] text-wire-300">
            {person.resume_url ? <p>Resume: {person.resume_url}</p> : null}
            {typeof links.github === "string" ? <p>GitHub: {links.github}</p> : null}
            {typeof links.linkedin === "string" ? <p>LinkedIn: {links.linkedin}</p> : null}
            {typeof links.portfolio === "string" ? <p>Portfolio: {links.portfolio}</p> : null}
            {!person.resume_url &&
            typeof links.github !== "string" &&
            typeof links.linkedin !== "string" &&
            typeof links.portfolio !== "string" ? (
              <p>No professional links shared.</p>
            ) : null}
          </div>
        </div>
      </FormSection>
    </main>
  );
}
