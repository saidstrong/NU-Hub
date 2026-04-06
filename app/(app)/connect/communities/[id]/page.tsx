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
import { formatCampusMessageTimestamp } from "@/lib/datetime";
import { reportContentAction } from "@/lib/moderation/actions";
import { toPublicStorageUrl } from "@/lib/validation/media";
import { isUuid } from "@/lib/validation/uuid";

type CommunityProfilePageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ message?: string; error?: string }>;
};

function formatFormalKindLabel(formalKind: "club" | "organization" | "official" | null): string {
  if (formalKind === "club") return "Club";
  if (formalKind === "organization") return "Organization";
  if (formalKind === "official") return "Official";
  return "Official";
}

function formatJoinAccessLabel(joinType: "open" | "request"): string {
  return joinType === "open" ? "Open to NU students" : "Owner approval required";
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
            title="Community"
            subtitle="Leadership, membership, and updates for this community."
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
  const ownerContextMeta = [ownerProfile?.school, ownerProfile?.major, ownerProfile?.year_label]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(" | ");
  const ownerMeta = [ownerProfile?.school, ownerProfile?.major, ownerProfile?.year_label]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(" • ");
  const ownerDisplayMeta = ownerContextMeta || ownerMeta;
  const joinActionLabel = community.join_type === "open" ? "Join community" : "Request to join";
  const joinPendingLabel = community.join_type === "open" ? "Joining..." : "Submitting...";
  const isFormalCommunity = community.community_type === "formal";
  const categoryLabel = community.category?.trim() || null;
  const visibleTags = community.tags.filter((tag) => tag.trim().toLowerCase() !== categoryLabel?.toLowerCase());
  const joinAccessLabel = formatJoinAccessLabel(community.join_type);
  const joinAccessNote =
    community.join_type === "open"
      ? "Any NU student can join immediately and share updates after joining."
      : "Students request access first. The owner reviews requests before members can join and post updates.";
  const memberSummary = memberCount === 1 ? "1 joined member" : `${memberCount} joined members`;
  const statusDisplayLabel =
    membership?.status === "joined"
      ? "Joined member"
      : membership?.status === "pending"
        ? "Request pending"
        : membership?.status === "rejected"
          ? "Request not approved"
          : membership?.status === "left"
            ? "Left community"
            : null;
  const actionSubtitle = isOwner
    ? "Run this community, review requests, and keep members updated."
    : membership?.status === "joined"
      ? "You are part of this community and can share updates below."
      : membership?.status === "pending"
        ? "Your request is waiting for owner review."
        : membership?.status === "rejected"
          ? "This community uses owner review before new members join."
          : membership?.status === "left"
            ? "Rejoining is currently unavailable for this community."
            : community.join_type === "open"
              ? "Any NU student can join immediately."
              : "Request access before joining and posting updates.";
  const actionNote = isOwner
    ? "Use Community updates to share something members should see."
    : membership?.status === "joined"
      ? "Joined members can share text updates in this community."
      : membership?.status === "pending"
        ? "You will be able to post after the owner approves your request."
        : membership?.status === "rejected"
          ? "You can still review the community before deciding whether to contact the lead."
          : membership?.status === "left"
            ? "If you need access again, contact the community lead directly."
            : community.join_type === "open"
              ? "Join now to follow updates and take part in the community."
              : "Request access to join and share updates once approved.";
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
  const membershipStatusLabel = statusDisplayLabel ?? statusLabel;
  const avatarUrl = toPublicStorageUrl("avatars", community.avatar_path);

  return (
    <main>
      <section className="wire-panel">
        <SectionHeader
          title="Community"
          subtitle="Leadership, membership, and updates for this community."
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
              <p className="mt-1 wire-meta">
                {(categoryLabel ? `${categoryLabel} community` : "Student community")}
                {" | "}
                {community.join_type === "open" ? "Open join" : "Join by request"}
              </p>
              <p className="mt-2 text-[13px] leading-relaxed text-wire-200">
                Led by{" "}
                <Link
                  href={`/connect/people/${community.created_by}`}
                  className="underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/40"
                >
                  {ownerName}
                </Link>
                {ownerDisplayMeta ? <span className="text-wire-300">{` | ${ownerDisplayMeta}`}</span> : null}
              </p>
            </div>
          </div>
          {isOwner ? (
            <Link href={`/connect/communities/${community.id}/edit`} className="wire-action-compact">
              Edit details
            </Link>
          ) : null}
        </div>
        <div className="mb-2 flex flex-wrap gap-2">
          {isFormalCommunity ? (
            <div className="inline-flex rounded-full border border-accent/35 bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-wire-100">
              {formatFormalKindLabel(community.formal_kind)}
            </div>
          ) : null}
          {categoryLabel ? <TagChip label={categoryLabel} tone="status" /> : null}
          {visibleTags.length > 0 ? visibleTags.map((tag) => <TagChip key={tag} label={tag} tone="status" />) : null}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-[var(--radius-input)] border border-wire-700 bg-wire-800 px-3 py-3">
            <p className="wire-label">Members</p>
            <p className="mt-1 text-[14px] font-medium text-wire-100">{memberSummary}</p>
            <p className="mt-1 wire-meta">
              {joinedMemberPreview.length > 0
                ? `Previewing ${joinedMemberPreview.length} current members below.`
                : "Member previews appear here as people join."}
            </p>
          </div>
          <div className="rounded-[var(--radius-input)] border border-wire-700 bg-wire-800 px-3 py-3">
            <p className="wire-label">Join access</p>
            <p className="mt-1 text-[14px] font-medium text-wire-100">{joinAccessLabel}</p>
            <p className="mt-1 wire-meta">{joinAccessNote}</p>
            {membershipStatusLabel ? <p className="mt-2 text-[12px] font-medium text-wire-200">Your status: {membershipStatusLabel}</p> : null}
            {statusNote ? <p className="mt-1 text-[12px] leading-relaxed text-wire-300">{statusNote}</p> : null}
          </div>
        </div>
      </section>

      {message ? <FeedbackBanner tone="success" message={message} /> : null}
      {error ? <FeedbackBanner tone="error" message={error} /> : null}
      {loadError ? <FeedbackBanner tone="error" message={loadError} /> : null}

      <div className="grid gap-6 xl:grid-cols-[1.45fr_1fr]">
        <div className="space-y-6">
          <SectionCard title="Purpose" subtitle="Who this community is for and what members do here.">
            <p className="text-[14px] leading-relaxed text-wire-200">{community.description}</p>
          </SectionCard>

          <SectionCard title="Community updates" subtitle="Updates from the lead and joined members.">
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
                    placeholder="Share an update members should see."
                    className="wire-textarea-field"
                  />
                </label>
                <div className="max-w-xs">
                  <SubmitButton
                    label="Share update"
                    pendingLabel="Sharing..."
                    variant="primary"
                  />
                </div>
              </form>
            ) : (
              <p className="wire-inline-empty">Join this community to post updates.</p>
            )}

            <div className="border-t border-wire-700 pt-4">
              {posts.length > 0 ? (
                <div className="space-y-2">
                  {posts.map((post) => {
                    const authorAvatarPath = post.authorAvatarPath?.trim() || null;
                    const authorAvatarUrl = toPublicStorageUrl("avatars", authorAvatarPath);
                    const canDeletePost = post.authorId === user.id || isOwner;
                    const canReportPost = post.authorId !== user.id;
                    const isLeadUpdate = post.authorId === community.created_by;

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
                              <div className="flex flex-wrap items-center gap-1.5">
                                <p className="truncate text-[13px] font-medium text-wire-100">{post.authorName}</p>
                                {isLeadUpdate ? (
                                  <span className="inline-flex rounded-full border border-accent/35 bg-accent/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.04em] text-wire-100">
                                    Lead update
                                  </span>
                                ) : null}
                              </div>
                              <p className="wire-meta">{formatCampusMessageTimestamp(post.createdAt)}</p>
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
                <p className="wire-inline-empty">No updates yet. Joined members can share the first update.</p>
              )}
            </div>
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard title="Members" subtitle="Current joined members in this community.">
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
              <p className="wire-inline-empty">No joined members yet.</p>
            )}
          </SectionCard>

          <SectionCard title="Lead" subtitle="Who runs this community.">
            <Link
              href={`/connect/people/${community.created_by}`}
              className="text-[13px] text-wire-200 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/40"
            >
              {ownerName}
            </Link>
            <p className="mt-1 wire-meta">Community owner</p>
            {ownerDisplayMeta ? <p className="mt-1 wire-meta">{ownerDisplayMeta}</p> : null}
          </SectionCard>

          <section className="wire-panel">
            <SectionHeader
              title="Actions"
              subtitle={actionSubtitle}
            />
            {isOwner ? (
              <div className="space-y-3">
                <div className="wire-action-row">
                  <ShellButton label="Manage requests" href="/connect/communities/requests" variant="primary" />
                  <Link href={`/connect/communities/${community.id}/edit`} className="wire-action">
                    Edit details
                  </Link>
                </div>
                <p className="text-[12px] leading-relaxed text-wire-300">{actionNote}</p>
              </div>
            ) : membership?.status === "joined" ? (
              <div className="space-y-3">
                <button type="button" className="wire-action-primary w-full" disabled>
                  Joined community
                </button>
                <p className="text-[12px] leading-relaxed text-wire-300">{actionNote}</p>
              </div>
            ) : membership?.status === "pending" ? (
              <div className="space-y-3">
                <button type="button" className="wire-action w-full" disabled>
                  Request pending
                </button>
                <p className="text-[12px] leading-relaxed text-wire-300">{actionNote}</p>
              </div>
            ) : membership?.status === "rejected" ? (
              <div className="space-y-3">
                <button type="button" className="wire-action w-full" disabled>
                  Request not approved
                </button>
                <p className="text-[12px] leading-relaxed text-wire-300">{actionNote}</p>
              </div>
            ) : membership?.status === "left" ? (
              <div className="space-y-3">
                <button type="button" className="wire-action w-full" disabled>
                  Rejoin unavailable
                </button>
                <p className="text-[12px] leading-relaxed text-wire-300">{actionNote}</p>
              </div>
            ) : (
              <div className="space-y-3">
                <form action={joinOrRequestCommunityAction} className="max-w-xs">
                  <input type="hidden" name="communityId" value={community.id} />
                  <SubmitButton
                    label={joinActionLabel}
                    pendingLabel={joinPendingLabel}
                    variant="primary"
                  />
                </form>
                <p className="text-[12px] leading-relaxed text-wire-300">{actionNote}</p>
              </div>
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
        </div>
      </div>
    </main>
  );
}
