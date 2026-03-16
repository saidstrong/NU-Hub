/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/ui/EmptyState";
import { FeedbackBanner } from "@/components/ui/FeedbackBanner";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ThreadAutoRefresh } from "@/components/ui/ThreadAutoRefresh";
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
      <main className="mx-auto w-full max-w-4xl">
        <TopBar
          title="Messages"
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
  const composerFieldId = `friend-message-input-${thread.conversationId}`;
  const counterpartMeta = [thread.counterpartMajor, thread.counterpartYearLabel]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(" • ");

  return (
    <main className="mx-auto w-full max-w-4xl">
      <TopBar
        title="Messages"
        subtitle={thread.counterpartName}
        backHref="/connect/messages"
      />
      {message ? <FeedbackBanner tone="success" message={message} /> : null}
      {error ? <FeedbackBanner tone="error" message={error} /> : null}
      {loadError ? <FeedbackBanner tone="error" message={loadError} /> : null}
      <ThreadAutoRefresh pauseWhenFocusedId={composerFieldId} />

      <section className="wire-panel py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex items-center gap-2.5">
            {counterpartAvatarUrl ? (
              <img
                src={counterpartAvatarUrl}
                alt={`${thread.counterpartName} avatar`}
                className="h-9 w-9 rounded-full border border-wire-700 bg-wire-900 object-cover"
              />
            ) : (
              <div className="h-9 w-9 rounded-full border border-dashed border-wire-600 bg-wire-900" />
            )}
            <div className="min-w-0">
              <p className="line-clamp-1 text-sm font-medium text-wire-100 [overflow-wrap:anywhere]">
                {thread.counterpartName}
              </p>
              {counterpartMeta ? <p className="mt-0.5 text-[11px] text-wire-400">{counterpartMeta}</p> : null}
            </div>
          </div>
          <Link href={`/connect/people/${thread.counterpartId}`} className="wire-link shrink-0">
            View profile
          </Link>
        </div>
      </section>

      <section className="wire-panel py-4">
        {thread.messages.length > 0 ? (
          <div className="space-y-2 rounded-[var(--radius-card)] border border-wire-700 bg-wire-950/55 p-3 sm:space-y-2.5 sm:p-4">
            {thread.messages.map((messageItem) => {
              const senderLabel = messageItem.isOwnMessage ? "You" : messageItem.senderName;

              return (
                <div key={messageItem.id} className={messageItem.isOwnMessage ? "flex justify-end" : "flex justify-start"}>
                  <article
                    className={messageItem.isOwnMessage
                      ? "max-w-[90%] rounded-2xl rounded-br-md border border-accent/45 bg-accent/18 px-3 py-2.5 sm:max-w-[78%] xl:max-w-[66%]"
                      : "max-w-[90%] rounded-2xl rounded-bl-md border border-wire-700 bg-wire-800 px-3 py-2.5 sm:max-w-[78%] xl:max-w-[66%]"}
                  >
                    <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.06em] text-wire-400">
                      {senderLabel}
                    </p>
                    <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-wire-100 [overflow-wrap:anywhere]">
                      {messageItem.content}
                    </p>
                    <p className="mt-1.5 text-right text-[10px] text-wire-400">{formatMessageTime(messageItem.createdAt)}</p>
                  </article>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="No messages yet"
            description="Send the first message to start your chat."
            className="py-6"
          />
        )}
        <div className="mt-4 border-t border-wire-700 pt-4">
          <form
            action={sendFriendMessageAction}
            className="space-y-2 rounded-[var(--radius-card)] border border-wire-700 bg-wire-950/45 p-3 sm:p-4"
          >
            <input type="hidden" name="conversationId" value={thread.conversationId} />
            <input type="hidden" name="redirectTo" value={conversationPath} />
            <textarea
              id={composerFieldId}
              name="content"
              required
              rows={3}
              maxLength={1200}
              placeholder="Write a message..."
              className="wire-textarea-field"
            />
            <div className="wire-action-row-single sm:flex sm:justify-end">
              <SubmitButton
                label="Send message"
                pendingLabel="Sending..."
                variant="primary"
                className="sm:w-auto sm:min-w-[132px]"
              />
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
