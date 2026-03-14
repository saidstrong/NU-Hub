import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { FeedbackBanner } from "@/components/ui/FeedbackBanner";
import { SectionCard } from "@/components/ui/SectionCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ShellButton } from "@/components/ui/ShellButton";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { TagChip } from "@/components/ui/TagChip";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import {
  createCommunityPostAction,
  deleteCommunityPostAction,
  joinOrRequestCommunityAction,
} from "@/lib/connect/actions";
import { getCommunityDetail } from "@/lib/connect/data";
import { reportContentAction } from "@/lib/moderation/actions";
import { toPublicStorageUrl } from "@/lib/validation/media";
import { isUuid } from "@/lib/validation/uuid";

type CommunityProfilePageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ message?: string; error?: string }>;
};

function formatPostTime(createdAt: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(createdAt));
}

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
        <section className="wire-panel">
          <SectionHeader
            title="Community profile"
            subtitle="Purpose, membership, and participation details."
            actionNode={
              <Link href="/connect/communities" className="wire-link">
                Back to communities
              </Link>
            }
          />
        </section>
        {error ? <FeedbackBanner tone="error" message={error} /> : null}
        {loadError ? <FeedbackBanner tone="error" message={loadError} /> : null}
        <EmptyState
          title="Community not available"
          description="This community may have been removed or is unavailable."
          actionLabel="Back to communities"
          actionHref="/connect/communities"
        />
      </main>
    );
  }

  const { community, memberCount, membership, ownerProfile, joinedMemberPreview, posts } = detail;
  const user = await requireUser();
  const isOwner = community.created_by === user.id;
  const canCreatePost = membership?.status === "joined";
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
      <section className="wire-panel">
        <SectionHeader
          title="Community profile"
          subtitle="Purpose, membership, and participation details."
          actionNode={
            <Link href="/connect/communities" className="wire-link">
              Back to communities
            </Link>
          }
        />
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt={`${community.name} avatar`}
                className="h-14 w-14 shrink-0 rounded-full border border-wire-700 bg-wire-900 object-cover"
              />
            ) : (
              <div className="h-14 w-14 shrink-0 rounded-full border border-dashed border-wire-600 bg-wire-900" />
            )}
            <div className="min-w-0">
              <h2 className="truncate text-[30px] font-semibold leading-[36px] tracking-tight text-wire-100">{community.name}</h2>
              <p className="mt-1 wire-meta">{community.join_type === "open" ? "Open community" : "Request-to-join community"}</p>
            </div>
          </div>
          {isOwner ? (
            <Link href={`/connect/communities/${community.id}/edit`} className="wire-action-compact">
              Edit
            </Link>
          ) : null}
        </div>
        <div className="mb-2 flex flex-wrap gap-2">
          {community.tags.length > 0 ? community.tags.map((tag) => <TagChip key={tag} label={tag} tone="status" />) : null}
        </div>
        <p className="wire-meta">Members: {memberCount}</p>
        {statusLabel ? <p className="mt-1 wire-meta">Your status: {statusLabel}</p> : null}
        {statusNote ? <p className="mt-1 text-[13px] text-wire-300">{statusNote}</p> : null}
      </section>

      {message ? <FeedbackBanner tone="success" message={message} /> : null}
      {error ? <FeedbackBanner tone="error" message={error} /> : null}
      {loadError ? <FeedbackBanner tone="error" message={loadError} /> : null}

      <SectionCard title="Description" subtitle="Community purpose and scope.">
        <p className="text-[14px] text-wire-200">{community.description}</p>
      </SectionCard>

      <SectionCard title="Posts" subtitle="Recent updates from joined members.">
        {canCreatePost ? (
          <form action={createCommunityPostAction} className="space-y-3">
            <input type="hidden" name="communityId" value={community.id} />
            <label className="block space-y-2">
              <span className="wire-label">Share an update</span>
              <textarea
                name="content"
                required
                rows={4}
                maxLength={1200}
                placeholder="Share something useful for this community."
                className="wire-textarea-field"
              />
            </label>
            <div className="max-w-xs">
              <SubmitButton
                label="Post update"
                pendingLabel="Posting..."
                variant="primary"
              />
            </div>
          </form>
        ) : (
          <p className="text-[13px] text-wire-300">Join this community to post updates.</p>
        )}

        <div className="border-t border-wire-700 pt-4">
          {posts.length > 0 ? (
            <div className="space-y-2">
              {posts.map((post) => {
                const authorAvatarPath = post.authorAvatarPath?.trim() || null;
                const authorAvatarUrl = toPublicStorageUrl("avatars", authorAvatarPath);
                const canDeletePost = post.authorId === user.id || isOwner;
                const canReportPost = post.authorId !== user.id;

                return (
                  <article
                    key={post.id}
                    className="rounded-[var(--radius-input)] border border-wire-700 bg-wire-800 px-3 py-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2.5">
                        {authorAvatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={authorAvatarUrl}
                            alt={`${post.authorName} avatar`}
                            className="h-8 w-8 shrink-0 rounded-full border border-wire-700 bg-wire-900 object-cover"
                          />
                        ) : (
                          <div className="h-8 w-8 shrink-0 rounded-full border border-dashed border-wire-600 bg-wire-900" />
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-medium text-wire-100">{post.authorName}</p>
                          <p className="wire-meta">{formatPostTime(post.createdAt)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {canDeletePost ? (
                          <form action={deleteCommunityPostAction}>
                            <input type="hidden" name="communityId" value={community.id} />
                            <input type="hidden" name="postId" value={post.id} />
                            <button type="submit" className="wire-action-compact">
                              Delete
                            </button>
                          </form>
                        ) : null}
                        {canReportPost ? (
                          <form action={reportContentAction}>
                            <input type="hidden" name="targetType" value="community_post" />
                            <input type="hidden" name="targetId" value={post.id} />
                            <input type="hidden" name="reason" value="inappropriate" />
                            <input type="hidden" name="redirectTo" value={`/connect/communities/${community.id}`} />
                            <button type="submit" className="wire-action-compact">
                              Report
                            </button>
                          </form>
                        ) : null}
                      </div>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-wire-200">
                      {post.content}
                    </p>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="text-[13px] text-wire-300">No posts yet. Be the first to share an update.</p>
          )}
        </div>
      </SectionCard>

      <SectionCard title="Members" subtitle="Joined members in this community.">
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
                  className="flex items-center gap-3 rounded-[var(--radius-input)] border border-wire-700 bg-wire-800 px-3 py-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
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
      </SectionCard>

      <SectionCard title="Owner" subtitle="Community owner profile context.">
        <Link
          href={`/connect/people/${community.created_by}`}
          className="text-[13px] text-wire-200 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/40"
        >
          {ownerName}
        </Link>
        {ownerMeta ? <p className="mt-1 wire-meta">{ownerMeta}</p> : null}
      </SectionCard>

      <section className="wire-panel">
        <SectionHeader
          title="Actions"
          subtitle="Primary community action and lightweight utilities."
        />
        {isOwner ? (
          <div className="wire-action-row">
            <ShellButton label="Manage requests" href="/connect/communities/requests" variant="primary" />
            <Link href="/connect/my-communities?view=created" className="wire-action">
              My communities
            </Link>
          </div>
        ) : membership?.status === "joined" ? (
          <button type="button" className="wire-action-primary w-full" disabled>
            Joined community
          </button>
        ) : membership?.status === "pending" ? (
          <button type="button" className="wire-action w-full" disabled>
            Request pending
          </button>
        ) : membership?.status === "rejected" ? (
          <button type="button" className="wire-action w-full" disabled>
            Request rejected
          </button>
        ) : membership?.status === "left" ? (
          <button type="button" className="wire-action w-full" disabled>
            Rejoin unavailable
          </button>
        ) : (
          <form action={joinOrRequestCommunityAction} className="max-w-xs">
            <input type="hidden" name="communityId" value={community.id} />
            <SubmitButton
              label={joinActionLabel}
              pendingLabel={joinPendingLabel}
              variant="primary"
            />
          </form>
        )}

        {!isOwner ? (
          <div className="mt-3">
            <form action={reportContentAction}>
              <input type="hidden" name="targetType" value="community" />
              <input type="hidden" name="targetId" value={community.id} />
              <input type="hidden" name="reason" value="inappropriate" />
              <input type="hidden" name="redirectTo" value={`/connect/communities/${community.id}`} />
              <button type="submit" className="wire-action-ghost">
                Report community
              </button>
            </form>
          </div>
        ) : null}
      </section>
    </main>
  );
}
