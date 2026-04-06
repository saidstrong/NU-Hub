import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { FeedbackBanner } from "@/components/ui/FeedbackBanner";
import { SectionCard } from "@/components/ui/SectionCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ShellButton } from "@/components/ui/ShellButton";
import { TagChip } from "@/components/ui/TagChip";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { isBirthdayTodayInCampusTimeZone } from "@/lib/datetime";
import {
  acceptFriendRequestAction,
  cancelFriendRequestAction,
  rejectFriendRequestAction,
  startFriendConversationAction,
  sendFriendRequestAction,
} from "@/lib/connect/actions";
import {
  getFriendshipWithPerson,
  getPersonProfile,
  getProfileTrustContext,
} from "@/lib/connect/data";
import { toPublicStorageUrl } from "@/lib/validation/media";
import { isUuid } from "@/lib/validation/uuid";

type PersonProfilePageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ message?: string; error?: string }>;
};

function hasText(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function joinLine(parts: Array<string | null | undefined>): string {
  return parts
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
    .join(" | ");
}

function formatMemberSinceLabel(value: string | null | undefined): string | null {
  const safeValue = typeof value === "string" ? value.trim() : "";
  if (!safeValue) return null;

  const date = new Date(safeValue);
  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function matchesSharedContext(
  viewerValue: string | null | undefined,
  personValue: string | null | undefined,
): boolean {
  const safeViewerValue = typeof viewerValue === "string" ? viewerValue.trim().toLowerCase() : "";
  const safePersonValue = typeof personValue === "string" ? personValue.trim().toLowerCase() : "";

  if (!safeViewerValue || !safePersonValue) {
    return false;
  }

  return safeViewerValue === safePersonValue;
}

export default async function PersonProfilePage({ params, searchParams }: PersonProfilePageProps) {
  const [{ id }, { message, error }] = await Promise.all([params, searchParams]);

  if (!isUuid(id)) {
    notFound();
  }

  const user = await requireUser();
  let viewerContext = null as Awaited<ReturnType<typeof getProfileTrustContext>>;
  let person = null as Awaited<ReturnType<typeof getPersonProfile>>;
  let friendship = null as Awaited<ReturnType<typeof getFriendshipWithPerson>>;
  let loadError: string | null = null;

  try {
    [person, viewerContext] = await Promise.all([
      getPersonProfile(id),
      getProfileTrustContext(user.id),
    ]);

    if (person && person.user_id !== user.id) {
      friendship = await getFriendshipWithPerson(person.user_id);
    }
  } catch (pageError) {
    loadError = pageError instanceof Error ? pageError.message : "Failed to load student profile.";
  }

  if (!person) {
    return (
      <main>
        <section className="wire-panel">
          <SectionHeader
            title="Student profile"
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

  const isSelfProfile = person.user_id === user.id;
  const academicLabel = joinLine([person.school, person.major, person.year_label]);
  const hasBio = typeof person.bio === "string" && person.bio.trim().length > 0;
  const avatarUrl = toPublicStorageUrl("avatars", person.avatar_path);
  const name =
    typeof person.full_name === "string" && person.full_name.trim().length > 0
      ? person.full_name.trim()
      : "NU student";
  const links =
    person.links && typeof person.links === "object" && !Array.isArray(person.links)
      ? (person.links as Record<string, unknown>)
      : {};
  const telegramNickname =
    typeof links.telegram === "string" && links.telegram.trim().length > 0
      ? links.telegram.trim()
      : null;
  const instagramNickname =
    typeof links.instagram === "string" && links.instagram.trim().length > 0
      ? links.instagram.trim()
      : null;
  const telegramLabel = telegramNickname
    ? (telegramNickname.startsWith("@") ? telegramNickname : `@${telegramNickname}`)
    : null;
  const instagramLabel = instagramNickname
    ? (instagramNickname.startsWith("@") ? instagramNickname : `@${instagramNickname}`)
    : null;
  const birthdayValue =
    typeof links.birthday === "string" && links.birthday.trim().length > 0
      ? links.birthday.trim()
      : null;
  const isBirthdayToday = isBirthdayTodayInCampusTimeZone(birthdayValue);
  const memberSinceLabel = formatMemberSinceLabel(person.created_at);
  const sharedContextLabels = !isSelfProfile
    ? [
        matchesSharedContext(viewerContext?.school, person.school) ? "Same school" : null,
        matchesSharedContext(viewerContext?.year_label, person.year_label) ? "Same year" : null,
      ].filter((value): value is string => Boolean(value))
    : [];
  const hasProfessionalLinks =
    Boolean(person.resume_url) ||
    typeof links.github === "string" ||
    typeof links.linkedin === "string" ||
    typeof links.portfolio === "string" ||
    Boolean(telegramLabel) ||
    Boolean(instagramLabel);
  const relationshipSummary = isSelfProfile
    ? "Manage your friend connections."
    : friendship?.status === "accepted"
      ? "You are friends."
      : friendship?.status === "pending" && friendship.requester_id === user.id
        ? "Friend request sent."
        : friendship?.status === "pending"
          ? "This student sent you a friend request."
          : "Not connected yet.";

  return (
    <main>
      <section className="wire-panel">
        <SectionHeader
          title="Student profile"
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
            <h2 className="mt-1 text-[30px] font-semibold leading-[36px] tracking-tight break-words text-wire-100">
              {name}
            </h2>
            <p className="mt-2 text-[14px] text-wire-300">{academicLabel || "Academic details not shared"}</p>
            {isBirthdayToday ? (
              <div className="mt-2 inline-flex items-center rounded-full border border-accent/35 bg-accent/10 px-2.5 py-1 text-[11px] font-medium text-wire-100">
                Birthday today
              </div>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <TagChip label="NU account" active />
              {memberSinceLabel ? <TagChip label={`Member since ${memberSinceLabel}`} /> : null}
              {sharedContextLabels.map((label) => (
                <TagChip key={label} label={label} />
              ))}
            </div>
            <p className="mt-2 text-[12px] text-wire-400">NU Atrium student profile</p>
          </div>
        </div>
        {person.interests.length > 0 ? (
          <div className="mt-5 border-t border-wire-700 pt-4">
            <p className="mb-2 wire-label">Focus areas</p>
            <div className="flex flex-wrap gap-2">
              {person.interests.map((entry) => (
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
          <SectionCard title="About" subtitle="Shared profile summary.">
            <p className="text-[14px] leading-relaxed text-wire-200">
              {hasBio ? person.bio?.trim() : "No bio provided yet."}
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
                {telegramLabel ? <p>Telegram: {telegramLabel}</p> : null}
                {instagramLabel ? <p>Instagram: {instagramLabel}</p> : null}
                {!hasProfessionalLinks ? (
                  <p className="wire-inline-empty">No professional links shared.</p>
                ) : null}
              </div>
            </div>
          </SectionCard>

          {!isSelfProfile ? (
            <section className="wire-panel">
              <SectionHeader title="Relationship" />
              <p className="mb-3 wire-meta">{relationshipSummary}</p>
              {friendship?.status === "accepted" ? (
                <div className="space-y-2">
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
                <div className="space-y-2">
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
                <div className="space-y-2">
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
              <SectionHeader title="Relationship" />
              <p className="mb-3 wire-meta">{relationshipSummary}</p>
              <ShellButton label="View friends" href="/connect/friends" variant="default" />
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
