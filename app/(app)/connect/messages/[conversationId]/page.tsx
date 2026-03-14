/* eslint-disable @next/next/no-img-element */
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/ui/EmptyState";
import { FeedbackBanner } from "@/components/ui/FeedbackBanner";
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

      <section className="wire-panel py-4">
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

      <section className="wire-panel py-4">
        {thread.messages.length > 0 ? (
          <div className="space-y-3 rounded-[var(--radius-card)] border border-wire-700 bg-wire-950/55 p-3 sm:p-4">
            {thread.messages.map((messageItem) => {
              const senderLabel = messageItem.isOwnMessage ? "You" : messageItem.senderName;

              return (
                <article
                  key={messageItem.id}
                  className={messageItem.isOwnMessage
                    ? "ml-auto max-w-[88%] rounded-2xl rounded-br-md border border-accent/45 bg-accent/18 px-3 py-2.5 sm:max-w-[78%] xl:max-w-[68%]"
                    : "mr-auto max-w-[88%] rounded-2xl rounded-bl-md border border-wire-700 bg-wire-800 px-3 py-2.5 sm:max-w-[78%] xl:max-w-[68%]"}
                >
                  <p className="mb-1 truncate text-[10px] font-medium uppercase tracking-[0.06em] text-wire-400">
                    {senderLabel}
                  </p>
                  <p className="whitespace-pre-wrap break-words text-[13px] text-wire-100">
                    {messageItem.content}
                  </p>
                  <p className="mt-1.5 text-right text-[10px] text-wire-400">{formatMessageTime(messageItem.createdAt)}</p>
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="No messages yet"
            description="Send the first message to start this conversation."
            className="py-6"
          />
        )}
      </section>

      <section className="wire-panel py-4">
        <form
          action={sendFriendMessageAction}
          className="space-y-2 rounded-[var(--radius-card)] border border-wire-700 bg-wire-950/45 p-3 sm:p-4"
        >
          <input type="hidden" name="conversationId" value={thread.conversationId} />
          <input type="hidden" name="redirectTo" value={conversationPath} />
          <textarea
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
      </section>
    </main>
  );
}
