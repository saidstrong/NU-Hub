/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { FeedbackBanner } from "@/components/ui/FeedbackBanner";
import { PageNavigation } from "@/components/ui/PageNavigation";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { TopBar } from "@/components/ui/TopBar";
import { formatCampusMessageTimestamp } from "@/lib/datetime";
import {
  formatCompactListingPrice,
  formatListingTypeLabel,
  formatPriceKzt,
  formatStatusLabel,
  getMarketplaceConversationsPage,
} from "@/lib/market/data";
import { buildPageHref, parsePageParam } from "@/lib/pagination";
import { toPublicStorageUrl } from "@/lib/validation/media";

type MarketMessagesPageProps = {
  searchParams: Promise<{
    page?: string;
    error?: string;
    message?: string;
  }>;
};

const MARKET_MESSAGES_PAGE_SIZE = 15;

export default async function MarketMessagesPage({ searchParams }: MarketMessagesPageProps) {
  const { page: pageParam, error, message } = await searchParams;
  const page = parsePageParam(pageParam);

  let conversations: Awaited<ReturnType<typeof getMarketplaceConversationsPage>>["conversations"] = [];
  let hasMore = false;
  let loadError: string | null = null;

  try {
    const paged = await getMarketplaceConversationsPage(page, MARKET_MESSAGES_PAGE_SIZE);
    conversations = paged.conversations;
    hasMore = paged.hasMore;
  } catch (conversationsError) {
    loadError =
      conversationsError instanceof Error
        ? conversationsError.message
        : "Failed to load conversations.";
  }

  const prioritizedConversations = [...conversations].sort((left, right) => {
    const leftNeedsReply = left.lastMessageSenderId === left.counterpartId;
    const rightNeedsReply = right.lastMessageSenderId === right.counterpartId;

    if (leftNeedsReply === rightNeedsReply) {
      return 0;
    }

    return leftNeedsReply ? -1 : 1;
  });

  const previousHref = page > 1 ? buildPageHref("/market/messages", page - 1) : undefined;
  const nextHref = hasMore ? buildPageHref("/market/messages", page + 1) : undefined;

  return (
    <main className="mx-auto w-full max-w-4xl">
      <TopBar
        title="Messages"
        subtitle="Marketplace deal inbox"
        backHref="/market"
      />
      {message ? <FeedbackBanner tone="success" message={message} /> : null}
      {error ? <FeedbackBanner tone="error" message={error} /> : null}
      {loadError ? <FeedbackBanner tone="error" message={loadError} /> : null}

      <section className="wire-panel">
        <SectionHeader
          title="Inbox"
          subtitle="Reply-needed listing conversations appear first."
        />

        {prioritizedConversations.length > 0 ? (
          <div className="space-y-2.5">
            {prioritizedConversations.map((conversation) => {
              const counterpartAvatarUrl = toPublicStorageUrl("avatars", conversation.counterpartAvatarPath);
              const needsReply = conversation.lastMessageSenderId === conversation.counterpartId;
              const replyStateLabel = needsReply ? "Reply needed" : "You replied";
              const timestampValue = conversation.lastMessageCreatedAt ?? conversation.updatedAt;
              const listingStatusLabel = conversation.listingStatus
                ? formatStatusLabel(conversation.listingStatus)
                : null;
              const listingTypeLabel = conversation.listingType
                ? formatListingTypeLabel(conversation.listingType)
                : null;
              const listingPriceLabel = conversation.listingPriceKzt !== null
                ? conversation.pricingModel
                  ? formatCompactListingPrice(conversation.listingPriceKzt, conversation.pricingModel)
                  : formatPriceKzt(conversation.listingPriceKzt)
                : "Price unavailable";
              const listingStatusClass = conversation.listingStatus === "active"
                ? "border-accent/35 bg-accent/10 text-wire-100"
                : conversation.listingStatus === "reserved"
                  ? "border-amber-300/35 bg-amber-300/10 text-amber-100"
                  : "border-wire-600 bg-wire-900 text-wire-300";
              const rowClass = needsReply
                ? "block rounded-[var(--radius-card)] border border-accent/35 bg-wire-800 px-3.5 py-3.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/40 sm:px-4"
                : "block rounded-[var(--radius-card)] border border-wire-700 bg-wire-800 px-3.5 py-3.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/40 sm:px-4";

              return (
                <Link
                  key={conversation.id}
                  href={`/market/messages/${conversation.id}`}
                  className={rowClass}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2.5">
                        {counterpartAvatarUrl ? (
                          <img
                            src={counterpartAvatarUrl}
                            alt={`${conversation.counterpartName} avatar`}
                            className="h-8 w-8 rounded-full border border-wire-700 bg-wire-900 object-cover"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-full border border-dashed border-wire-600 bg-wire-900" />
                        )}
                        <div className="min-w-0">
                          <p className="line-clamp-1 text-sm font-medium text-wire-100 [overflow-wrap:anywhere]">
                            {conversation.counterpartName}
                          </p>
                          <span className={needsReply
                            ? "mt-0.5 inline-flex rounded-full border border-accent/35 bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-wire-100"
                            : "mt-0.5 inline-flex rounded-full border border-wire-600 bg-wire-900 px-2 py-0.5 text-[11px] font-medium text-wire-300"}
                          >
                            {replyStateLabel}
                          </span>
                        </div>
                      </div>
                    </div>
                    <p className="text-[11px] text-wire-300">{formatCampusMessageTimestamp(timestampValue)}</p>
                  </div>

                  <div className="mt-3 flex items-center gap-2.5 rounded-[var(--radius-input)] border border-wire-700 bg-wire-900/60 p-2.5">
                    {conversation.listingCoverImageUrl ? (
                      <img
                        src={conversation.listingCoverImageUrl}
                        alt={`${conversation.listingTitle} preview`}
                        className="h-11 w-11 shrink-0 rounded-[10px] border border-wire-700 bg-wire-900 object-cover"
                      />
                    ) : (
                      <div className="h-11 w-11 shrink-0 rounded-[10px] border border-dashed border-wire-600 bg-wire-900" />
                    )}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="line-clamp-1 text-[13px] font-medium text-wire-100 [overflow-wrap:anywhere]">
                          {conversation.listingTitle}
                        </p>
                        {listingStatusLabel ? (
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${listingStatusClass}`}>
                            {listingStatusLabel}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 text-[11px] text-wire-300">
                        {listingPriceLabel}
                        {listingTypeLabel ? ` | ${listingTypeLabel}` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="mt-2.5">
                    <p className="line-clamp-1 text-[13px] text-wire-200 [overflow-wrap:anywhere]">
                      {conversation.lastMessagePreview}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : !loadError ? (
          <EmptyState
            title="No listing conversations yet"
            description="Message a seller from any listing to open a marketplace conversation."
            actionLabel="Browse listings"
            actionHref="/market"
            className="py-6"
          />
        ) : null}

        <div className="mt-4">
          <PageNavigation
            previousHref={previousHref}
            nextHref={nextHref}
            previousLabel="Previous page"
            nextLabel="Next page"
          />
        </div>
      </section>
    </main>
  );
}
