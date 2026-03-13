/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/ui/EmptyState";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { TopBar } from "@/components/ui/TopBar";
import { sendMarketplaceMessageAction } from "@/lib/market/actions";
import { getMarketplaceConversationThread } from "@/lib/market/data";
import { toPublicStorageUrl } from "@/lib/validation/media";
import { isUuid } from "@/lib/validation/uuid";

type MarketConversationPageProps = {
  params: Promise<{ conversationId: string }>;
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
};

function formatMessageTime(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default async function MarketConversationPage({
  params,
  searchParams,
}: MarketConversationPageProps) {
  const [{ conversationId }, { error, message }] = await Promise.all([params, searchParams]);

  if (!isUuid(conversationId)) {
    notFound();
  }

  let thread: Awaited<ReturnType<typeof getMarketplaceConversationThread>> = null;
  let loadError: string | null = null;

  try {
    thread = await getMarketplaceConversationThread(conversationId);
  } catch (threadError) {
    loadError = threadError instanceof Error ? threadError.message : "Failed to load conversation.";
  }

  if (!thread) {
    return (
      <main>
        <TopBar
          title="Conversation"
          subtitle="Listing messages"
          backHref="/market/messages"
        />
        {loadError ? (
          <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-[13px] text-red-200">
            {loadError}
          </div>
        ) : null}
        <EmptyState
          title="Conversation not available"
          description="This conversation may have been removed or is unavailable to your account."
          actionLabel="Back to messages"
          actionHref="/market/messages"
        />
      </main>
    );
  }

  const counterpartAvatarUrl = toPublicStorageUrl("avatars", thread.counterpartAvatarPath);
  const conversationPath = `/market/messages/${thread.conversationId}`;

  return (
    <main>
      <TopBar
        title="Conversation"
        subtitle={`With ${thread.counterpartName}`}
        backHref="/market/messages"
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
        <div className="mb-3 flex items-center gap-2.5 border-b border-wire-700 pb-3">
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
            <p className="truncate text-sm text-wire-100">{thread.counterpartName}</p>
            <p className="wire-meta">{thread.listingTitle}</p>
          </div>
        </div>
        {thread.listingHref ? (
          <Link href={thread.listingHref} className="wire-link">
            Open listing
          </Link>
        ) : (
          <p className="wire-meta">Listing unavailable</p>
        )}
      </section>

      <section className="wire-panel">
        <div className="mb-3 border-b border-wire-700 pb-3">
          <h2 className="wire-section-title">Messages</h2>
        </div>
        {thread.messages.length > 0 ? (
          <div className="space-y-3">
            {thread.messages.map((messageItem) => {
              const senderAvatarUrl = toPublicStorageUrl("avatars", messageItem.senderAvatarPath);

              return (
                <article
                  key={messageItem.id}
                  className={messageItem.isOwnMessage
                    ? "ml-8 rounded-2xl border border-accent/30 bg-accent/10 px-3 py-3"
                    : "mr-8 rounded-2xl border border-wire-700 bg-wire-800 px-3 py-3"}
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
          <p className="text-[13px] text-wire-300">
            No messages yet. Send the first message to start the conversation.
          </p>
        )}
      </section>

      <section className="wire-panel">
        <h2 className="mb-2 text-sm font-semibold text-wire-100">Send message</h2>
        <form action={sendMarketplaceMessageAction} className="space-y-2">
          <input type="hidden" name="conversationId" value={thread.conversationId} />
          <input type="hidden" name="redirectTo" value={conversationPath} />
          <textarea
            name="content"
            required
            rows={4}
            maxLength={1200}
            placeholder="Ask about price, pickup time, or item details."
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
