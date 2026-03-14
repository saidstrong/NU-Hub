/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { FeedbackBanner } from "@/components/ui/FeedbackBanner";
import { SectionHeader } from "@/components/ui/SectionHeader";
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
    <main className="mx-auto w-full max-w-4xl">
      <TopBar
        title="Messages"
        subtitle="Friend conversations"
        backHref="/connect"
        actions={[{ label: "Friends", href: "/connect/friends" }]}
      />
      {message ? <FeedbackBanner tone="success" message={message} /> : null}
      {error ? <FeedbackBanner tone="error" message={error} /> : null}
      {loadError ? <FeedbackBanner tone="error" message={loadError} /> : null}

      <section className="wire-panel">
        <SectionHeader title="Inbox" />

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
                  className="block rounded-[var(--radius-input)] border border-wire-700 bg-wire-800 px-4 py-3 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex items-start gap-2.5">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={`${conversation.counterpartName} avatar`}
                          className="h-8 w-8 rounded-full border border-wire-700 bg-wire-900 object-cover"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full border border-dashed border-wire-600 bg-wire-900" />
                      )}
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold text-wire-100">
                            {conversation.counterpartName}
                          </p>
                          <span className={replyBadgeClass}>
                            {replyLabel}
                          </span>
                        </div>
                        <p className="mt-1 line-clamp-1 text-[13px] text-wire-200">
                          {conversation.lastMessagePreview}
                        </p>
                      </div>
                    </div>
                    <p className="shrink-0 text-[11px] text-wire-300">{formatMessageTime(conversation.lastMessageAt)}</p>
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
            className="py-6"
          />
        ) : null}
      </section>
    </main>
  );
}
