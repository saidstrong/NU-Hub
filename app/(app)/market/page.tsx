import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { FeedbackBanner } from "@/components/ui/FeedbackBanner";
import { ListingCard } from "@/components/ui/ListingCard";
import { PageNavigation } from "@/components/ui/PageNavigation";
import { SearchBar } from "@/components/ui/SearchBar";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { ShellButton } from "@/components/ui/ShellButton";
import { TagChip } from "@/components/ui/TagChip";
import { buildPageHref, parsePageParam } from "@/lib/pagination";
import { marketCategories } from "@/lib/mock-data";
import { getActiveListingsPage, toListingCardData } from "@/lib/market/data";

type MarketHomePageProps = {
  searchParams: Promise<{
    page?: string;
  }>;
};

const MARKET_PAGE_SIZE = 12;

export default async function MarketHomePage({ searchParams }: MarketHomePageProps) {
  const { page: pageParam } = await searchParams;
  const page = parsePageParam(pageParam);

  let listings: Awaited<ReturnType<typeof getActiveListingsPage>>["listings"] = [];
  let hasMore = false;
  let loadError: string | null = null;

  try {
    const pagedListings = await getActiveListingsPage(page, MARKET_PAGE_SIZE);
    listings = pagedListings.listings;
    hasMore = pagedListings.hasMore;
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Failed to load listings.";
  }

  const previousHref = page > 1 ? buildPageHref("/market", page - 1) : undefined;
  const nextHref = hasMore ? buildPageHref("/market", page + 1) : undefined;

  return (
    <main>
      <section className="wire-panel">
        <SectionHeader
          title="Market"
          actionNode={
            <Link href="/market/my-listings" className="wire-link">
              My listings
            </Link>
          }
        />
        <div className="mt-3">
          <SearchBar
            placeholder="Search marketplace"
            queryName="q"
            defaultValue=""
            action="/search"
          />
        </div>
      </section>

      <section className="wire-panel py-4">
        <div className="-mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {marketCategories.map((category) => (
            <Link
              key={category}
              href={`/market/category/${category.toLowerCase()}`}
              className="shrink-0 snap-start"
            >
              <TagChip label={category} />
            </Link>
          ))}
        </div>
      </section>

      <section className="wire-panel py-4">
        <div className="flex flex-wrap items-center gap-2">
          <ShellButton label="Post listing" href="/market/post" variant="primary" block={false} />
          <Link href="/market/messages" className="wire-action">
            Messages
          </Link>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          <Link href="/market/saved" className="wire-link">
            Saved listings
          </Link>
          <Link href="/market/my-listings" className="wire-link">
            Listing status
          </Link>
        </div>
      </section>

      <SectionCard
        title="Recent listings"
        actionLabel="Saved listings"
        actionHref="/market/saved"
      >
        {loadError ? <FeedbackBanner tone="error" message={loadError} className="mb-3" /> : null}
        {listings.length > 0 ? (
          <div className="grid gap-3 xl:grid-cols-2">
            {listings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={toListingCardData(listing)}
                href={`/market/item/${listing.id}`}
              />
            ))}
          </div>
        ) : !loadError ? (
          <EmptyState
            title="No active listings yet"
            description="Published listings will appear here for students to browse."
            actionLabel="Post item"
            actionHref="/market/post"
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
      </SectionCard>
    </main>
  );
}
