/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/ui/EmptyState";
import { FeedbackBanner } from "@/components/ui/FeedbackBanner";
import { MessageComposer } from "@/components/ui/MessageComposer";
import { TagChip } from "@/components/ui/TagChip";
import { ThreadAutoRefresh } from "@/components/ui/ThreadAutoRefresh";
import { TopBar } from "@/components/ui/TopBar";
import { formatCampusMessageTimestamp } from "@/lib/datetime";
import { sendMarketplaceMessageAction } from "@/lib/market/actions";
import {
  formatCompactListingPrice,
  formatListingTypeLabel,
  formatPriceKzt,
  formatStatusLabel,
  getMarketplaceConversationThread,
} from "@/lib/market/data";
import { toPublicStorageUrl } from "@/lib/validation/media";
import { isUuid } from "@/lib/validation/uuid";

type MarketConversationPageProps = {
  params: Promise<{ conversationId: string }>;
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
};

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
  const composerFieldId = `market-message-input-${thread.conversationId}`;
  const listingStatusLabel = thread.listingStatus ? formatStatusLabel(thread.listingStatus) : null;
  const listingTypeLabel = thread.listingType ? formatListingTypeLabel(thread.listingType) : null;
  const listingPriceLabel = thread.listingPriceKzt !== null
    ? thread.pricingModel
      ? formatCompactListingPrice(thread.listingPriceKzt, thread.pricingModel)
      : formatPriceKzt(thread.listingPriceKzt)
    : "Price unavailable";
  const viewerRoleLabel = thread.viewerRole === "buyer" ? "Buyer" : "Seller";
  const counterpartRoleLabel = thread.counterpartRole === "buyer" ? "Buyer" : "Seller";
  const listingAvailabilityNote = listingStatusLabel && thread.listingStatus !== "active"
    ? `This listing is marked ${listingStatusLabel.toLowerCase()}. Confirm whether it is still available before arranging pickup or handoff.`
    : thread.viewerRole === "buyer" && !thread.listingHref
      ? "This listing is no longer visible in the active market feed. Confirm current availability and handoff details in this conversation."
      : null;

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
      <ThreadAutoRefresh pauseWhenFocusedId={composerFieldId} />

      <section className="wire-panel py-4">
        <div className="space-y-3">
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
              <p className="line-clamp-1 text-sm font-medium text-wire-100 [overflow-wrap:anywhere]">
                {thread.counterpartName}
              </p>
              <p className="wire-meta">
                {thread.counterpartName} is the {counterpartRoleLabel.toLowerCase()} in this listing conversation.
              </p>
            </div>
          </div>

          {thread.listingHref ? (
            <Link
              href={thread.listingHref}
              className="flex items-center gap-2.5 rounded-[var(--radius-input)] border border-wire-700 bg-wire-900/60 p-2.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/40"
            >
              {thread.listingCoverImageUrl ? (
                <img
                  src={thread.listingCoverImageUrl}
                  alt={`${thread.listingTitle} preview`}
                  className="h-11 w-11 shrink-0 rounded-[10px] border border-wire-700 bg-wire-900 object-cover"
                />
              ) : (
                <div className="h-11 w-11 shrink-0 rounded-[10px] border border-dashed border-wire-600 bg-wire-900" />
              )}
              <div className="min-w-0">
                <p className="line-clamp-1 text-[13px] font-medium text-wire-100 [overflow-wrap:anywhere]">
                  {thread.listingTitle}
                </p>
                <p className="mt-0.5 text-[11px] text-wire-300">
                  {listingPriceLabel}
                  {listingTypeLabel ? ` | ${listingTypeLabel}` : ""}
                  {listingStatusLabel ? ` | ${listingStatusLabel}` : ""}
                </p>
              </div>
            </Link>
          ) : (
            <div className="rounded-[var(--radius-input)] border border-wire-700 bg-wire-900/60 px-3 py-2.5">
              <p className="text-[13px] text-wire-100">{thread.listingTitle}</p>
              <p className="mt-0.5 text-[11px] text-wire-300">Listing unavailable</p>
            </div>
          )}
          <div className="rounded-[var(--radius-input)] border border-wire-700 bg-wire-900/40 px-3 py-2.5">
            <p className="wire-label">Coordination context</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <TagChip label={`You: ${viewerRoleLabel}`} active />
              <TagChip label={`Counterpart: ${counterpartRoleLabel}`} />
              {listingStatusLabel && thread.listingStatus !== "active" ? (
                <TagChip label={`Listing ${listingStatusLabel}`} tone="status" />
              ) : null}
            </div>
            {thread.listingPickupLocation ? (
              <p className="mt-2 text-[12px] leading-relaxed text-wire-300">
                Pickup / handoff: {thread.listingPickupLocation}
              </p>
            ) : null}
          </div>
          {listingAvailabilityNote ? (
            <div className="rounded-[var(--radius-input)] border border-wire-700 bg-wire-900/40 px-3 py-2.5">
              <p className="wire-label">Listing availability</p>
              <p className="mt-1 text-[12px] leading-relaxed text-wire-300">
                {listingAvailabilityNote}
              </p>
            </div>
          ) : null}
          <div className="rounded-[var(--radius-input)] border border-wire-700 bg-wire-900/40 px-3 py-2.5">
            <p className="wire-label">Safety reminder</p>
            <p className="mt-1 text-[12px] leading-relaxed text-wire-300">
              Review the listing details before confirming, meet in a public campus location, and use the listing page to report suspicious activity.
            </p>
          </div>
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
                    <p className="mt-1.5 text-right text-[10px] text-wire-400">
                      {formatCampusMessageTimestamp(messageItem.createdAt)}
                    </p>
                  </article>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="No messages yet"
            description="Send the first message to start this listing conversation."
            className="py-6"
          />
        )}
        <div className="mt-4 border-t border-wire-700 pt-4">
          <MessageComposer
            action={sendMarketplaceMessageAction}
            conversationId={thread.conversationId}
            redirectTo={conversationPath}
            fieldId={composerFieldId}
            placeholder="Ask about price, pickup time, or item details."
          />
        </div>
      </section>
    </main>
  );
}
