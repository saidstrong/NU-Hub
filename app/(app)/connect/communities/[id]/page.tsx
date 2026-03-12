import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { FormSection } from "@/components/ui/FormSection";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { TagChip } from "@/components/ui/TagChip";
import { TopBar } from "@/components/ui/TopBar";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { joinOrRequestCommunityAction } from "@/lib/connect/actions";
import { getCommunityDetail } from "@/lib/connect/data";
import { toPublicStorageUrl } from "@/lib/validation/media";
import { isUuid } from "@/lib/validation/uuid";

type CommunityProfilePageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ message?: string; error?: string }>;
};

export default async function CommunityProfilePage({
  params,
  searchParams,
}: CommunityProfilePageProps) {
  const { message, error } = await searchParams;
  const { id } = await params;

  if (!isUuid(id)) {
    notFound();
  }

  let detail = null as Awaited<ReturnType<typeof getCommunityDetail>>;
  let loadError: string | null = null;

  try {
    detail = await getCommunityDetail(id);
  } catch (loadDetailError) {
    loadError = loadDetailError instanceof Error ? loadDetailError.message : "Failed to load community.";
  }

  if (!detail) {
    return (
      <main>
        <TopBar
          title="Community Profile"
          subtitle="Purpose, membership, and participation details"
          backHref="/connect/communities"
        />
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
          title="Community not available"
          description="This community may have been removed or is unavailable."
          actionLabel="Back to communities"
          actionHref="/connect/communities"
        />
      </main>
    );
  }

  const { community, memberCount, membership, ownerProfile, joinedMemberPreview } = detail;
  const user = await requireUser();
  const isOwner = community.created_by === user.id;
  const ownerName = ownerProfile?.full_name?.trim() || "Community owner";
  const ownerMeta = [ownerProfile?.school, ownerProfile?.major, ownerProfile?.year_label]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(" - ");
  const joinActionLabel = community.join_type === "open" ? "Join community" : "Request to join";
  const joinPendingLabel = community.join_type === "open" ? "Joining..." : "Submitting...";
  const statusLabel =
    membership?.status === "joined"
      ? "Joined"
      : membership?.status === "pending"
        ? "Pending"
        : membership?.status === "rejected"
          ? "Rejected"
          : membership?.status === "left"
            ? "Left"
            : null;
  const statusNote =
    membership?.status === "pending"
      ? "Your join request is waiting for owner review."
      : membership?.status === "rejected"
        ? "Your previous request was rejected by the owner."
        : membership?.status === "left"
          ? "You have left this community."
        : null;
  const avatarUrl = toPublicStorageUrl("avatars", community.avatar_path);

  return (
    <main>
      <TopBar
        title="Community Profile"
        subtitle="Purpose, membership, and participation details"
        backHref="/connect/communities"
        actions={isOwner ? [{ label: "Edit", href: `/connect/communities/${community.id}/edit` }] : []}
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

      <section className="wire-panel">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt={`${community.name} avatar`}
                className="h-12 w-12 shrink-0 rounded-full border border-wire-700 bg-wire-900 object-cover"
              />
            ) : (
              <div className="h-12 w-12 shrink-0 rounded-full border border-dashed border-wire-600 bg-wire-900" />
            )}
            <h2 className="truncate text-[17px] font-semibold tracking-tight text-wire-100">{community.name}</h2>
          </div>
          <span className="rounded-xl border border-wire-600 bg-wire-800 px-2 py-1 text-[12px] text-wire-300">
            {community.join_type === "open" ? "Open" : "Request"}
          </span>
        </div>
        <div className="mb-2 flex flex-wrap gap-2">
          {community.tags.length > 0 ? community.tags.map((tag) => <TagChip key={tag} label={tag} />) : null}
        </div>
        <p className="wire-meta">Members: {memberCount}</p>
        {statusLabel ? <p className="mt-1 wire-meta">Your status: {statusLabel}</p> : null}
        {statusNote ? <p className="mt-1 text-[12px] text-wire-300">{statusNote}</p> : null}
      </section>

      <FormSection title="Description" description="Community purpose and scope.">
        <p className="text-[13px] text-wire-200">{community.description}</p>
      </FormSection>

      <FormSection title="Members" description="Joined members in this community.">
        {joinedMemberPreview.length > 0 ? (
          <div className="space-y-2">
            {joinedMemberPreview.map((member) => {
              const memberAvatarPath = member.avatar_path?.trim() || null;
              const memberAvatarUrl = toPublicStorageUrl("avatars", memberAvatarPath);
              const memberMeta = [member.major, member.year_label]
                .map((value) => value?.trim())
                .filter(Boolean)
                .join(" - ");

              return (
                <Link
                  key={member.user_id}
                  href={`/connect/people/${member.user_id}`}
                  className="flex items-center gap-3 rounded-xl border border-wire-700 bg-wire-800 px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/40"
                >
                  {memberAvatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={memberAvatarUrl}
                      alt={`${member.full_name || "Member"} avatar`}
                      className="h-9 w-9 shrink-0 rounded-full border border-wire-700 bg-wire-900 object-cover"
                    />
                  ) : (
                    <div className="h-9 w-9 shrink-0 rounded-full border border-dashed border-wire-600 bg-wire-900" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-[13px] text-wire-100">
                      {member.full_name || "NU student"}
                    </p>
                    <p className="wire-meta">{memberMeta || "Campus member"}</p>
                  </div>
                </Link>
              );
            })}
            {memberCount > joinedMemberPreview.length ? (
              <p className="wire-meta">
                Showing {joinedMemberPreview.length} of {memberCount} joined members.
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-[13px] text-wire-300">No joined members yet.</p>
        )}
      </FormSection>

      <FormSection title="Owner" description="Community owner profile context.">
        <Link
          href={`/connect/people/${community.created_by}`}
          className="text-[13px] text-wire-200 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/40"
        >
          {ownerName}
        </Link>
        {ownerMeta ? <p className="mt-1 wire-meta">{ownerMeta}</p> : null}
      </FormSection>

      {isOwner ? (
        <div className="wire-action-row">
          <Link href="/connect/communities/requests" className="wire-action">
            Manage requests
          </Link>
          <Link href="/connect/my-communities?view=created" className="wire-action">
            My communities
          </Link>
        </div>
      ) : membership?.status === "joined" ? (
        <div className="wire-action-row-single">
          <button type="button" className="wire-action-primary w-full" disabled>
            Joined community
          </button>
        </div>
      ) : membership?.status === "pending" ? (
        <div className="wire-action-row-single">
          <button type="button" className="wire-action w-full" disabled>
            Request pending
          </button>
        </div>
      ) : membership?.status === "rejected" ? (
        <div className="wire-action-row-single">
          <button type="button" className="wire-action w-full" disabled>
            Request rejected
          </button>
        </div>
      ) : membership?.status === "left" ? (
        <div className="wire-action-row-single">
          <button type="button" className="wire-action w-full" disabled>
            Rejoin unavailable
          </button>
        </div>
      ) : (
        <div className="wire-action-row-single">
          <form action={joinOrRequestCommunityAction}>
            <input type="hidden" name="communityId" value={community.id} />
            <SubmitButton
              label={joinActionLabel}
              pendingLabel={joinPendingLabel}
              variant="primary"
            />
          </form>
        </div>
      )}
    </main>
  );
}
