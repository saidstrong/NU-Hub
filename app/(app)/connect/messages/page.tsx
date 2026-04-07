/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { FeedbackBanner } from "@/components/ui/FeedbackBanner";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { TopBar } from "@/components/ui/TopBar";
import { requireUser } from "@/lib/auth/session";
import { getFriendInbox } from "@/lib/connect/data";
import { formatCampusMessageTimestamp } from "@/lib/datetime";
import { toPublicStorageUrl } from "@/lib/validation/media";

type ConnectMessagesPageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
};

const FRIEND_INBOX_LIMIT = 30;

export default async function ConnectMessagesPage({ searchParams }: ConnectMessagesPageProps) {
  const [{ error, message }, user] = await Promise.all([searchParams, requireUser()]);

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
        title="Friend messages"
        subtitle="Conversations with accepted friends."
        backHref="/connect"
        actions={[{ label: "Friends", href: "/connect/friends" }]}
      />
      {message ? <FeedbackBanner tone="success" message={message} /> : null}
      {error ? <FeedbackBanner tone="error" message={error} /> : null}
      {loadError ? <FeedbackBanner tone="error" message={loadError} /> : null}

      <section className="wire-panel">
        <SectionHeader
          title="Recent conversations"
          subtitle="Open any conversation to catch up or reply."
        />

        {conversations.length > 0 ? (
          <div className="space-y-2.5">
            {conversations.map((conversation) => {
              const avatarUrl = toPublicStorageUrl("avatars", conversation.counterpartAvatarPath);
              const hasLastMessage = Boolean(conversation.lastMessageSenderId);
              const needsReply = conversation.lastMessageSenderId === conversation.counterpartId;
              const replyLabel = !hasLastMessage ? "No messages" : needsReply ? "Needs reply" : "You replied";
              const counterpartMeta = [conversation.counterpartMajor, conversation.counterpartYearLabel]
                .map((value) => value?.trim())
                .filter(Boolean)
                .join(" | ");
              const replyBadgeClass = !hasLastMessage
                ? "rounded-full border border-wire-600 bg-wire-900 px-2 py-0.5 text-[11px] font-medium text-wire-300"
                : needsReply
                  ? "rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent"
                  : "rounded-full border border-wire-600 bg-wire-900 px-2 py-0.5 text-[11px] font-medium text-wire-300";
              const rowClass = needsReply
                ? "block rounded-[var(--radius-card)] border border-accent/35 bg-wire-800 px-3.5 py-3.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/40 sm:px-4"
                : "block rounded-[var(--radius-card)] border border-wire-700 bg-wire-800 px-3.5 py-3.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/40 sm:px-4";
              const previewText = hasLastMessage
                ? conversation.lastMessagePreview
                : "Open the conversation to send the first message.";
              const previewClass = needsReply
                ? "mt-1 line-clamp-1 text-[13px] font-medium text-wire-100 [overflow-wrap:anywhere]"
                : "mt-1 line-clamp-1 text-[13px] text-wire-200 [overflow-wrap:anywhere]";

              return (
                <Link
                  key={conversation.conversationId}
                  href={`/connect/messages/${conversation.conversationId}`}
                  className={rowClass}
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
                          <p className="line-clamp-1 text-sm font-semibold text-wire-100 [overflow-wrap:anywhere]">
                            {conversation.counterpartName}
                          </p>
                          <span className={replyBadgeClass}>
                            {replyLabel}
                          </span>
                        </div>
                        {counterpartMeta ? (
                          <p className="mt-0.5 text-[11px] text-wire-400">{counterpartMeta}</p>
                        ) : null}
                        <p className={previewClass}>
                          {previewText}
                        </p>
                      </div>
                    </div>
                    <p className="shrink-0 text-[11px] text-wire-300">
                      {formatCampusMessageTimestamp(conversation.lastMessageAt)}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : !loadError ? (
          <EmptyState
            title="No friend conversations yet"
            description="Open an accepted friend's profile when you want to start a conversation."
            actionLabel="Open friends"
            actionHref="/connect/friends"
            className="py-6"
          />
        ) : null}
      </section>
    </main>
  );
}
