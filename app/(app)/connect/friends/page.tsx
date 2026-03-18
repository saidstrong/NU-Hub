/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { TopBar } from "@/components/ui/TopBar";
import { requireUser } from "@/lib/auth/session";
import { acceptFriendRequestAction, rejectFriendRequestAction } from "@/lib/connect/actions";
import { getFriendRequests, getFriends } from "@/lib/connect/data";
import { formatCampusMessageTimestamp } from "@/lib/datetime";
import { toPublicStorageUrl } from "@/lib/validation/media";

type ConnectFriendsPageProps = {
  searchParams: Promise<{
    message?: string;
    error?: string;
  }>;
};

export default async function ConnectFriendsPage({ searchParams }: ConnectFriendsPageProps) {
  const { message, error } = await searchParams;
  const user = await requireUser();

  let requests: Awaited<ReturnType<typeof getFriendRequests>> = [];
  let friends: Awaited<ReturnType<typeof getFriends>> = [];
  let loadError: string | null = null;

  try {
    [requests, friends] = await Promise.all([
      getFriendRequests(user.id, 20),
      getFriends(user.id, 300),
    ]);
  } catch (friendsError) {
    loadError = friendsError instanceof Error ? friendsError.message : "Failed to load friends.";
  }

  return (
    <main>
      <TopBar
        title="Friends"
        backHref="/connect"
        actions={[{ label: "People", href: "/connect/people" }]}
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
        <div className="mb-3 border-b border-wire-700 pb-3">
          <h2 className="wire-section-title">Incoming requests</h2>
        </div>
        {requests.length > 0 ? (
          <div className="space-y-2.5">
            {requests.map((request) => {
              const avatarUrl = toPublicStorageUrl("avatars", request.requesterAvatarPath);
              const requesterMeta = [request.requesterMajor, request.requesterYearLabel]
                .map((value) => value?.trim())
                .filter(Boolean)
                .join(" - ");

              return (
                <article key={request.friendshipId} className="rounded-xl border border-wire-700 bg-wire-800 px-3 py-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={`${request.requesterName} avatar`}
                          className="h-9 w-9 shrink-0 rounded-full border border-wire-700 bg-wire-900 object-cover"
                        />
                      ) : (
                        <div className="h-9 w-9 shrink-0 rounded-full border border-dashed border-wire-600 bg-wire-900" />
                      )}
                      <div className="min-w-0">
                        <Link
                          href={`/connect/people/${request.requesterId}`}
                          className="truncate text-[13px] font-medium text-wire-100 underline-offset-2 hover:underline"
                        >
                          {request.requesterName}
                        </Link>
                        <p className="wire-meta">{requesterMeta || "Campus member"}</p>
                      </div>
                    </div>
                    <p className="wire-meta shrink-0">{formatCampusMessageTimestamp(request.createdAt)}</p>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <form action={acceptFriendRequestAction} className="w-full">
                      <input type="hidden" name="friendshipId" value={request.friendshipId} />
                      <input type="hidden" name="redirectTo" value="/connect/friends" />
                      <button type="submit" className="wire-action-primary w-full">
                        Accept
                      </button>
                    </form>
                    <form action={rejectFriendRequestAction} className="w-full">
                      <input type="hidden" name="friendshipId" value={request.friendshipId} />
                      <input type="hidden" name="redirectTo" value="/connect/friends" />
                      <button type="submit" className="wire-action w-full">
                        Reject
                      </button>
                    </form>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="text-[13px] text-wire-300">No incoming requests right now.</p>
        )}
      </section>

      <section className="wire-panel">
        <div className="mb-3 border-b border-wire-700 pb-3">
          <h2 className="wire-section-title">Friends</h2>
        </div>
        {friends.length > 0 ? (
          <div className="space-y-2.5">
            {friends.map((friend) => {
              const avatarUrl = toPublicStorageUrl("avatars", friend.friendAvatarPath);
              const friendMeta = [friend.friendMajor, friend.friendYearLabel]
                .map((value) => value?.trim())
                .filter(Boolean)
                .join(" - ");

              return (
                <Link
                  key={friend.friendshipId}
                  href={`/connect/people/${friend.friendId}`}
                  className="flex items-center gap-3 rounded-xl border border-wire-700 bg-wire-800 px-3 py-2.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/40"
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={`${friend.friendName} avatar`}
                      className="h-10 w-10 shrink-0 rounded-full border border-wire-700 bg-wire-900 object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 shrink-0 rounded-full border border-dashed border-wire-600 bg-wire-900" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-wire-100">{friend.friendName}</p>
                    <p className="wire-meta">{friendMeta || "Campus member"}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="No friends yet"
            description="You haven't added any friends yet."
            actionLabel="Find people"
            actionHref="/connect/people"
          />
        )}
      </section>
    </main>
  );
}
