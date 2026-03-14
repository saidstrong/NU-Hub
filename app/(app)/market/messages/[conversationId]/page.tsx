/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/ui/EmptyState";
import { FeedbackBanner } from "@/components/ui/FeedbackBanner";
import { SectionHeader } from "@/components/ui/SectionHeader";
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
      <main className="mx-auto w-full max-w-4xl">
        <TopBar
          title="Conversation"
          subtitle="Conversation"
          backHref="/market/messages"
        />
        {loadError ? <FeedbackBanner tone="error" message={loadError} /> : null}
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
    <main className="mx-auto w-full max-w-4xl">
      <TopBar
        title="Conversation"
        subtitle={thread.counterpartName}
        backHref="/market/messages"
      />
      {message ? <FeedbackBanner tone="success" message={message} /> : null}
      {error ? <FeedbackBanner tone="error" message={error} /> : null}
      {loadError ? <FeedbackBanner tone="error" message={loadError} /> : null}

      <section className="wire-panel">
        <SectionHeader title="Conversation" />
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
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-wire-100">{thread.counterpartName}</p>
            <p className="wire-meta">{thread.listingTitle}</p>
          </div>
        </div>
        {thread.listingHref ? (
          <Link href={thread.listingHref} className="wire-link mt-3 inline-flex">
            Open listing
          </Link>
        ) : (
          <p className="wire-meta mt-3">Listing unavailable</p>
        )}
      </section>

      <section className="wire-panel">
        <SectionHeader title="Messages" />
        {thread.messages.length > 0 ? (
          <div className="space-y-2">
            {thread.messages.map((messageItem) => {
              return (
                <article
                  key={messageItem.id}
                  className={messageItem.isOwnMessage
                    ? "ml-auto max-w-[88%] rounded-2xl border border-accent/35 bg-accent/12 px-3 py-2.5 sm:max-w-[78%] xl:max-w-[68%]"
                    : "mr-auto max-w-[88%] rounded-2xl border border-wire-700 bg-wire-800 px-3 py-2.5 sm:max-w-[78%] xl:max-w-[68%]"}
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <p className="truncate text-[11px] font-medium text-wire-300">{messageItem.senderName}</p>
                    <p className="text-[10px] text-wire-400">{formatMessageTime(messageItem.createdAt)}</p>
                  </div>
                  <p className="whitespace-pre-wrap break-words text-[13px] text-wire-100">
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
            className="py-6"
          />
        )}
      </section>

      <section className="wire-panel">
        <SectionHeader title="Send message" />
        <form action={sendMarketplaceMessageAction} className="space-y-2">
          <input type="hidden" name="conversationId" value={thread.conversationId} />
          <input type="hidden" name="redirectTo" value={conversationPath} />
          <textarea
            name="content"
            required
            rows={3}
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
