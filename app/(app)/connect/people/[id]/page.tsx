import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { FeedbackBanner } from "@/components/ui/FeedbackBanner";
import { SectionCard } from "@/components/ui/SectionCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ShellButton } from "@/components/ui/ShellButton";
import { TagChip } from "@/components/ui/TagChip";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import {
  acceptFriendRequestAction,
  cancelFriendRequestAction,
  rejectFriendRequestAction,
  startFriendConversationAction,
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
        <section className="wire-panel">
          <SectionHeader
            title="Student profile"
            subtitle="Campus identity and collaboration context."
            actionNode={
              <Link href="/connect/people" className="wire-link">
                Back to people
              </Link>
            }
          />
        </section>
        {message ? <FeedbackBanner tone="success" message={message} /> : null}
        {error ? <FeedbackBanner tone="error" message={error} /> : null}
        {loadError ? <FeedbackBanner tone="error" message={loadError} /> : null}
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
  const subtitle = `${personCard.major} • ${personCard.year}`;
  const avatarUrl = toPublicStorageUrl("avatars", person.avatar_path);
  const name = personCard.name || "NU student";
  const links =
    person.links && typeof person.links === "object" && !Array.isArray(person.links)
      ? (person.links as Record<string, unknown>)
      : {};

  return (
    <main>
      <section className="wire-panel">
        <SectionHeader
          title="Student profile"
          subtitle="Campus identity and collaboration context."
          actionNode={
            <Link href="/connect/people" className="wire-link">
              Back to people
            </Link>
          }
        />
        <div className="flex items-start gap-4">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt={`${name} avatar`}
              className="h-16 w-16 shrink-0 rounded-full border border-wire-700 bg-wire-900 object-cover"
            />
          ) : (
            <div className="h-16 w-16 shrink-0 rounded-full border border-dashed border-wire-600 bg-wire-900" />
          )}
          <div className="min-w-0">
            <p className="wire-label">Campus profile</p>
            <h2 className="mt-1 truncate text-[30px] font-semibold leading-[36px] tracking-tight text-wire-100">
              {name}
            </h2>
            <p className="mt-2 text-[14px] text-wire-300">{subtitle}</p>
          </div>
        </div>
        {personCard.interests.length > 0 ? (
          <div className="mt-5 border-t border-wire-700 pt-4">
            <p className="mb-2 wire-label">Focus areas</p>
            <div className="flex flex-wrap gap-2">
              {personCard.interests.map((entry) => (
                <TagChip key={entry} label={entry} />
              ))}
            </div>
          </div>
        ) : null}
      </section>

      {message ? <FeedbackBanner tone="success" message={message} /> : null}
      {error ? <FeedbackBanner tone="error" message={error} /> : null}
      {loadError ? <FeedbackBanner tone="error" message={loadError} /> : null}

      <div className="grid gap-6 xl:grid-cols-[1.45fr_1fr]">
        <div className="space-y-6">
          <SectionCard title="Bio" subtitle="Snapshot of academic and collaboration context.">
            <p className="text-[14px] leading-relaxed text-wire-200">
              {person.bio || "No bio provided yet."}
            </p>
          </SectionCard>

          <SectionCard title="Looking for" subtitle="Current collaboration intent.">
            <div className="flex flex-wrap gap-2">
              {person.looking_for.length > 0 ? (
                person.looking_for.map((entry) => <TagChip key={entry} label={entry} />)
              ) : (
                <div className="wire-inline-empty">
                  No collaboration preferences shared.
                </div>
              )}
            </div>
          </SectionCard>

          <SectionCard title="Goals" subtitle="Academic or project goals shared by this student.">
            {person.goals.length > 0 ? (
              <div className="space-y-2">
                {person.goals.map((goal) => (
                  <div
                    key={goal}
                    className="rounded-[var(--radius-input)] border border-wire-700 bg-wire-800 px-4 py-2.5 text-[13px] text-wire-200"
                  >
                    {goal}
                  </div>
                ))}
              </div>
            ) : (
              <p className="wire-inline-empty">No goals shared yet.</p>
            )}
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard title="Professional context (optional)" subtitle="Optional collaboration context.">
            <div>
              <p className="mb-2 wire-meta">Skills</p>
              <div className="flex flex-wrap gap-2">
                {person.skills.length > 0 ? (
                  person.skills.map((skill) => <TagChip key={skill} label={skill} />)
                ) : (
                  <p className="wire-inline-empty">No skills listed.</p>
                )}
              </div>
            </div>
            <div className="border-t border-wire-700 pt-4">
              <p className="mb-2 wire-meta">Links</p>
              <div className="space-y-1.5 text-[13px] text-wire-300">
                {person.resume_url ? <p>Resume: {person.resume_url}</p> : null}
                {typeof links.github === "string" ? <p>GitHub: {links.github}</p> : null}
                {typeof links.linkedin === "string" ? <p>LinkedIn: {links.linkedin}</p> : null}
                {typeof links.portfolio === "string" ? <p>Portfolio: {links.portfolio}</p> : null}
                {!person.resume_url &&
                typeof links.github !== "string" &&
                typeof links.linkedin !== "string" &&
                typeof links.portfolio !== "string" ? (
                  <p className="wire-inline-empty">No professional links shared.</p>
                ) : null}
              </div>
            </div>
          </SectionCard>

          {!isSelfProfile ? (
            <section className="wire-panel">
              <SectionHeader
                title="Relationship"
                subtitle="Manage friend connection and messaging actions."
              />
              {friendship?.status === "accepted" ? (
                <div className="wire-action-row">
                  <form action={startFriendConversationAction} className="w-full">
                    <input type="hidden" name="friendId" value={person.user_id} />
                    <input type="hidden" name="redirectTo" value={`/connect/people/${person.user_id}`} />
                    <button type="submit" className="wire-action-primary w-full">
                      Message
                    </button>
                  </form>
                  <button type="button" className="wire-action w-full" disabled>
                    Friends
                  </button>
                </div>
              ) : friendship?.status === "pending" && friendship.requester_id === user.id ? (
                <div className="wire-action-row">
                  <button type="button" className="wire-action w-full" disabled>
                    Request sent
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
                <form action={sendFriendRequestAction} className="w-full">
                  <input type="hidden" name="addresseeId" value={person.user_id} />
                  <input type="hidden" name="redirectTo" value={`/connect/people/${person.user_id}`} />
                  <button type="submit" className="wire-action-primary w-full">
                    Add friend
                  </button>
                </form>
              )}
            </section>
          ) : (
            <section className="wire-panel">
              <SectionHeader
                title="Relationship"
                subtitle="Your friend network and messaging."
              />
              <ShellButton label="View friends" href="/connect/friends" variant="default" />
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
