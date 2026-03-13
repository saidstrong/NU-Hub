import { EmptyState } from "@/components/ui/EmptyState";
import { FormSection } from "@/components/ui/FormSection";
import { ProfileHeader } from "@/components/ui/ProfileHeader";
import { TagChip } from "@/components/ui/TagChip";
import { TopBar } from "@/components/ui/TopBar";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import {
  acceptFriendRequestAction,
  cancelFriendRequestAction,
  rejectFriendRequestAction,
  sendFriendRequestAction,
} from "@/lib/connect/actions";
import { getFriendshipWithPerson, getPersonProfile, toPersonCardData } from "@/lib/connect/data";
import { toPublicStorageUrl } from "@/lib/validation/media";
import { isUuid } from "@/lib/validation/uuid";

type PersonProfilePageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ message?: string; error?: string }>;
};

export default async function PersonProfilePage({ params, searchParams }: PersonProfilePageProps) {
  const [{ id }, { message, error }] = await Promise.all([params, searchParams]);

  if (!isUuid(id)) {
    notFound();
  }

  const user = await requireUser();
  let person = null as Awaited<ReturnType<typeof getPersonProfile>>;
  let friendship = null as Awaited<ReturnType<typeof getFriendshipWithPerson>>;
  let loadError: string | null = null;

  try {
    person = await getPersonProfile(id);
    if (person && person.user_id !== user.id) {
      friendship = await getFriendshipWithPerson(person.user_id);
    }
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
          actions={[{ label: "Friends", href: "/connect/friends" }]}
        />
        {message ? (
          <div className="rounded-xl border border-accent/35 bg-accent/10 px-3 py-2 text-[13px] text-wire-100">
            {message}
          </div>
        ) : null}
        {error ? (
          <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-[13px] text-red-200">
            {error}
          </div>
        ) : null}
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
  const isSelfProfile = person.user_id === user.id;
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
        actions={[{ label: "Friends", href: "/connect/friends" }]}
      />
      {message ? (
        <div className="rounded-xl border border-accent/35 bg-accent/10 px-3 py-2 text-[13px] text-wire-100">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-[13px] text-red-200">
          {error}
        </div>
      ) : null}
      {loadError ? (
        <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-[13px] text-red-200">
          {loadError}
        </div>
      ) : null}
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
      {!isSelfProfile ? (
        friendship?.status === "accepted" ? (
          <div className="wire-action-row-single">
            <button type="button" className="wire-action-primary w-full" disabled>
              Friends
            </button>
          </div>
        ) : friendship?.status === "pending" && friendship.requester_id === user.id ? (
          <div className="wire-action-row">
            <button type="button" className="wire-action w-full" disabled>
              Request Sent
            </button>
            <form action={cancelFriendRequestAction} className="w-full">
              <input type="hidden" name="friendshipId" value={friendship.id} />
              <input type="hidden" name="redirectTo" value={`/connect/people/${person.user_id}`} />
              <button type="submit" className="wire-action w-full">
                Cancel
              </button>
            </form>
          </div>
        ) : friendship?.status === "pending" ? (
          <div className="wire-action-row">
            <form action={acceptFriendRequestAction} className="w-full">
              <input type="hidden" name="friendshipId" value={friendship.id} />
              <input type="hidden" name="redirectTo" value={`/connect/people/${person.user_id}`} />
              <button type="submit" className="wire-action-primary w-full">
                Accept
              </button>
            </form>
            <form action={rejectFriendRequestAction} className="w-full">
              <input type="hidden" name="friendshipId" value={friendship.id} />
              <input type="hidden" name="redirectTo" value={`/connect/people/${person.user_id}`} />
              <button type="submit" className="wire-action w-full">
                Reject
              </button>
            </form>
          </div>
        ) : (
          <div className="wire-action-row-single">
            <form action={sendFriendRequestAction} className="w-full">
              <input type="hidden" name="addresseeId" value={person.user_id} />
              <input type="hidden" name="redirectTo" value={`/connect/people/${person.user_id}`} />
              <button type="submit" className="wire-action-primary w-full">
                Add Friend
              </button>
            </form>
          </div>
        )
      ) : (
        <div className="wire-action-row-single">
          <a href="/connect/friends" className="wire-action w-full text-center">
            View Friends
          </a>
        </div>
      )}
    </main>
  );
}
