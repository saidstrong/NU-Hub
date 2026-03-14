/* eslint-disable @next/next/no-img-element */
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/ui/EmptyState";
import { FeedbackBanner } from "@/components/ui/FeedbackBanner";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { TopBar } from "@/components/ui/TopBar";
import { sendFriendMessageAction } from "@/lib/connect/actions";
import { getFriendConversationThread } from "@/lib/connect/data";
import { toPublicStorageUrl } from "@/lib/validation/media";
import { isUuid } from "@/lib/validation/uuid";

type FriendConversationPageProps = {
  params: Promise<{ conversationId: string }>;
  searchParams: Promise<{ error?: string; message?: string }>;
};

function formatMessageTime(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default async function FriendConversationPage({
  params,
  searchParams,
}: FriendConversationPageProps) {
  const [{ conversationId }, { error, message }] = await Promise.all([params, searchParams]);

  if (!isUuid(conversationId)) {
    notFound();
  }

  let thread: Awaited<ReturnType<typeof getFriendConversationThread>> = null;
  let loadError: string | null = null;

  try {
    thread = await getFriendConversationThread(conversationId);
  } catch (threadError) {
    loadError = threadError instanceof Error ? threadError.message : "Failed to load conversation.";
  }

  if (!thread) {
    return (
      <main>
        <TopBar
          title="Messages"
          subtitle="Friend conversation"
          backHref="/connect/messages"
        />
        {loadError ? <FeedbackBanner tone="error" message={loadError} /> : null}
        <EmptyState
          title="Conversation not available"
          description="This conversation may be unavailable for your account."
          actionLabel="Back to messages"
          actionHref="/connect/messages"
        />
      </main>
    );
  }

  const counterpartAvatarUrl = toPublicStorageUrl("avatars", thread.counterpartAvatarPath);
  const conversationPath = `/connect/messages/${thread.conversationId}`;

  return (
    <main>
      <TopBar
        title="Messages"
        subtitle={`With ${thread.counterpartName}`}
        backHref="/connect/messages"
      />
      {message ? <FeedbackBanner tone="success" message={message} /> : null}
      {error ? <FeedbackBanner tone="error" message={error} /> : null}
      {loadError ? <FeedbackBanner tone="error" message={loadError} /> : null}

      <section className="wire-panel">
        <SectionHeader title="Conversation context" subtitle="Counterpart profile context." />
        <div className="flex items-center gap-2.5">
          {counterpartAvatarUrl ? (
            <img
              src={counterpartAvatarUrl}
              alt={`${thread.counterpartName} avatar`}
              className="h-9 w-9 rounded-full border border-wire-700 bg-wire-900 object-cover"
            />
          ) : (
            <div className="h-9 w-9 rounded-full border border-dashed border-wire-600 bg-wire-900" />
          )}
          <p className="truncate text-sm font-medium text-wire-100">{thread.counterpartName}</p>
        </div>
      </section>

      <section className="wire-panel">
        <SectionHeader title="Messages" subtitle="Thread history in chronological order." />
        {thread.messages.length > 0 ? (
          <div className="space-y-2.5">
            {thread.messages.map((messageItem) => {
              const senderAvatarUrl = toPublicStorageUrl("avatars", messageItem.senderAvatarPath);

              return (
                <article
                  key={messageItem.id}
                  className={messageItem.isOwnMessage
                    ? "ml-4 rounded-[var(--radius-input)] border border-accent/25 bg-accent/10 px-3 py-3 sm:ml-10"
                    : "mr-4 rounded-[var(--radius-input)] border border-wire-700 bg-wire-800 px-3 py-3 sm:mr-10"}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      {senderAvatarUrl ? (
                        <img
                          src={senderAvatarUrl}
                          alt={`${messageItem.senderName} avatar`}
                          className="h-6 w-6 rounded-full border border-wire-700 bg-wire-900 object-cover"
                        />
                      ) : (
                        <div className="h-6 w-6 rounded-full border border-dashed border-wire-600 bg-wire-900" />
                      )}
                      <p className="truncate text-[12px] font-medium text-wire-100">{messageItem.senderName}</p>
                    </div>
                    <p className="text-[11px] text-wire-300">{formatMessageTime(messageItem.createdAt)}</p>
                  </div>
                  <p className="mt-1.5 whitespace-pre-wrap break-words text-[13px] text-wire-200">
                    {messageItem.content}
                  </p>
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="No messages yet"
            description="Send the first message to start this conversation."
          />
        )}
      </section>

      <section className="wire-panel">
        <SectionHeader title="Send message" subtitle="Keep it clear and actionable." />
        <form action={sendFriendMessageAction} className="space-y-2">
          <input type="hidden" name="conversationId" value={thread.conversationId} />
          <input type="hidden" name="redirectTo" value={conversationPath} />
          <textarea
            name="content"
            required
            rows={4}
            maxLength={1200}
            placeholder="Write a message..."
            className="wire-textarea-field"
          />
          <div className="wire-action-row-single">
            <SubmitButton
              label="Send message"
              pendingLabel="Sending..."
              variant="primary"
            />
          </div>
        </form>
      </section>
    </main>
  );
}
