/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { FeedbackBanner } from "@/components/ui/FeedbackBanner";
import { PageNavigation } from "@/components/ui/PageNavigation";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { TopBar } from "@/components/ui/TopBar";
import { getMarketplaceConversationsPage } from "@/lib/market/data";
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

function formatMessageTime(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

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

  const previousHref = page > 1 ? buildPageHref("/market/messages", page - 1) : undefined;
  const nextHref = hasMore ? buildPageHref("/market/messages", page + 1) : undefined;

  return (
    <main>
      <TopBar
        title="Messages"
        subtitle="Conversations with buyers and sellers"
        backHref="/market"
      />
      {message ? <FeedbackBanner tone="success" message={message} /> : null}
      {error ? <FeedbackBanner tone="error" message={error} /> : null}
      {loadError ? <FeedbackBanner tone="error" message={loadError} /> : null}

      <section className="wire-panel">
        <SectionHeader
          title="Inbox"
          subtitle="Recent listing conversations, ordered by latest activity."
        />

        {conversations.length > 0 ? (
          <div className="space-y-2.5">
            {conversations.map((conversation) => {
              const counterpartAvatarUrl = toPublicStorageUrl("avatars", conversation.counterpartAvatarPath);
              const needsReply = conversation.lastMessageSenderId === conversation.counterpartId;
              const replyStateLabel = needsReply ? "Needs reply" : "You replied";
              const timestampLabel = conversation.lastMessageCreatedAt ? "Last message" : "Started";
              const timestampValue = conversation.lastMessageCreatedAt ?? conversation.updatedAt;

              return (
                <Link
                  key={conversation.id}
                  href={`/market/messages/${conversation.id}`}
                  className="block rounded-[var(--radius-card)] border border-wire-700 bg-wire-800 px-4 py-3 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-wire-100">
                        {conversation.listingTitle}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <p className="wire-meta">With {conversation.counterpartName}</p>
                        <span className={needsReply
                          ? "rounded-full border border-accent/35 bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-wire-100"
                          : "rounded-full border border-wire-600 bg-wire-900 px-2 py-0.5 text-[11px] font-medium text-wire-300"}
                        >
                          {replyStateLabel}
                        </span>
                      </div>
                    </div>
                    <p className="wire-meta shrink-0 text-right leading-[1.25]">
                      {timestampLabel}
                      <br />
                      <span className="text-wire-200">{formatMessageTime(timestampValue)}</span>
                    </p>
                  </div>
                  <div className="mt-2 flex items-center gap-2.5">
                    {counterpartAvatarUrl ? (
                      <img
                        src={counterpartAvatarUrl}
                        alt={`${conversation.counterpartName} avatar`}
                        className="h-8 w-8 rounded-full border border-wire-700 bg-wire-900 object-cover"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full border border-dashed border-wire-600 bg-wire-900" />
                    )}
                    <p className="line-clamp-1 text-[13px] text-wire-200">{conversation.lastMessagePreview}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : !loadError ? (
          <EmptyState
            title="No conversations yet"
            description="Start by messaging a seller from a listing."
            actionLabel="Browse market"
            actionHref="/market"
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
