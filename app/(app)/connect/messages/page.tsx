/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { TopBar } from "@/components/ui/TopBar";
import { requireUser } from "@/lib/auth/session";
import { getFriendInbox } from "@/lib/connect/data";
import { toPublicStorageUrl } from "@/lib/validation/media";

type ConnectMessagesPageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
};

const FRIEND_INBOX_LIMIT = 30;

function formatMessageTime(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default async function ConnectMessagesPage({ searchParams }: ConnectMessagesPageProps) {
  const { error, message } = await searchParams;
  const user = await requireUser();

  let conversations: Awaited<ReturnType<typeof getFriendInbox>> = [];
  let loadError: string | null = null;

  try {
    conversations = await getFriendInbox(user.id, FRIEND_INBOX_LIMIT);
  } catch (inboxError) {
    loadError = inboxError instanceof Error ? inboxError.message : "Failed to load messages.";
  }

  return (
    <main>
      <TopBar
        title="Messages"
        subtitle="Direct messages with accepted friends"
        backHref="/connect"
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

      <section className="wire-panel">
        <div className="mb-3 border-b border-wire-700 pb-3">
          <h2 className="wire-section-title">Inbox</h2>
          <p className="mt-1 wire-meta">Recent friend conversations, newest activity first.</p>
        </div>

        {conversations.length > 0 ? (
          <div className="space-y-2.5">
            {conversations.map((conversation) => {
              const avatarUrl = toPublicStorageUrl("avatars", conversation.counterpartAvatarPath);
              const hasLastMessage = Boolean(conversation.lastMessageSenderId);
              const needsReply = conversation.lastMessageSenderId === conversation.counterpartId;
              const replyLabel = !hasLastMessage ? "No messages" : needsReply ? "Needs reply" : "You replied";
              const replyBadgeClass = !hasLastMessage
                ? "rounded-full border border-wire-600 bg-wire-900 px-2 py-0.5 text-[11px] font-medium text-wire-300"
                : needsReply
                  ? "rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent"
                  : "rounded-full border border-wire-600 bg-wire-900 px-2 py-0.5 text-[11px] font-medium text-wire-300";

              return (
                <Link
                  key={conversation.conversationId}
                  href={`/connect/messages/${conversation.conversationId}`}
                  className="block rounded-2xl border border-wire-700 bg-wire-800 px-3 py-3 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-wire-100">
                          {conversation.counterpartName}
                        </p>
                        <span className={replyBadgeClass}>
                          {replyLabel}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-[13px] text-wire-200">{conversation.lastMessagePreview}</p>
                    </div>
                    <p className="wire-meta shrink-0">{formatMessageTime(conversation.lastMessageAt)}</p>
                  </div>
                  <div className="mt-2 flex items-center gap-2.5">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={`${conversation.counterpartName} avatar`}
                        className="h-8 w-8 rounded-full border border-wire-700 bg-wire-900 object-cover"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full border border-dashed border-wire-600 bg-wire-900" />
                    )}
                    <p className="wire-meta">Open conversation</p>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : !loadError ? (
          <EmptyState
            title="No messages yet"
            description="Open an accepted friend profile and tap Message to start chatting."
            actionLabel="Find friends"
            actionHref="/connect/friends"
          />
        ) : null}
      </section>
    </main>
  );
}
