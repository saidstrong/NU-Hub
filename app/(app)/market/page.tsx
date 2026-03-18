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
import {
  getActiveListingsPage,
  getFeaturedListings,
  type ListingType,
  toListingCardDataWithOptions,
} from "@/lib/market/data";

type MarketHomePageProps = {
  searchParams: Promise<{
    page?: string;
    type?: string;
  }>;
};

const MARKET_PAGE_SIZE = 12;
const MARKET_TYPE_FILTERS = ["all", "sale", "rental", "service"] as const;
type MarketTypeFilter = (typeof MARKET_TYPE_FILTERS)[number];

function parseMarketTypeFilter(value?: string): MarketTypeFilter {
  if (!value || value === "all") return "all";
  if (value === "sale" || value === "rental" || value === "service") return value;
  return "all";
}

function buildMarketHref(page: number, type: MarketTypeFilter): string {
  return buildPageHref("/market", page, {
    type: type === "all" ? undefined : type,
  });
}

function formatMarketTypeLabel(value: MarketTypeFilter): string {
  if (value === "sale") return "Sale";
  if (value === "rental") return "Rental";
  if (value === "service") return "Service";
  return "All";
}

export default async function MarketHomePage({ searchParams }: MarketHomePageProps) {
  const { page: pageParam, type } = await searchParams;
  const page = parsePageParam(pageParam);
  const selectedType = parseMarketTypeFilter(type);
  const listingTypeFilter = selectedType === "all" ? undefined : (selectedType as ListingType);

  let listings: Awaited<ReturnType<typeof getActiveListingsPage>>["listings"] = [];
  let featuredListings: Awaited<ReturnType<typeof getFeaturedListings>> = [];
  let hasMore = false;
  let loadError: string | null = null;

  try {
    const [featuredListingsResult, pagedListings] = await Promise.all([
      getFeaturedListings(4, {
        listingType: listingTypeFilter,
      }),
      getActiveListingsPage(page, MARKET_PAGE_SIZE, {
        excludeFeatured: true,
        listingType: listingTypeFilter,
      }),
    ]);
    featuredListings = featuredListingsResult;
    listings = pagedListings.listings;
    hasMore = pagedListings.hasMore;
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Failed to load listings.";
  }

  const previousHref = page > 1 ? buildMarketHref(page - 1, selectedType) : undefined;
  const nextHref = hasMore ? buildMarketHref(page + 1, selectedType) : undefined;

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
        <p className="mb-2 wire-label">Listing type</p>
        <div className="-mx-1 mb-3 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {MARKET_TYPE_FILTERS.map((filterValue) => (
            <Link
              key={filterValue}
              href={buildMarketHref(1, filterValue)}
              className="shrink-0 snap-start"
            >
              <TagChip label={formatMarketTypeLabel(filterValue)} active={selectedType === filterValue} />
            </Link>
          ))}
        </div>
        <p className="mb-2 wire-label">Category</p>
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

      {featuredListings.length > 0 ? (
        <SectionCard title="Featured listings">
          <div className="grid gap-3 lg:grid-cols-2">
            {featuredListings.map((listing) => {
              const cardData = toListingCardDataWithOptions(listing, { showStatus: true });
              return (
                <ListingCard
                  key={`featured-${listing.id}`}
                  listing={{
                    ...cardData,
                    status: cardData.status === "Active" ? "Available" : cardData.status,
                    highlightLabel: "Featured",
                  }}
                  href={`/market/item/${listing.id}`}
                />
              );
            })}
          </div>
        </SectionCard>
      ) : null}

      <SectionCard
        title={selectedType === "all" ? "Recent listings" : `Recent ${formatMarketTypeLabel(selectedType).toLowerCase()} listings`}
        actionLabel="Saved listings"
        actionHref="/market/saved"
      >
        {loadError ? <FeedbackBanner tone="error" message={loadError} className="mb-3" /> : null}
        {listings.length > 0 ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {listings.map((listing) => {
              const cardData = toListingCardDataWithOptions(listing, { showStatus: true });
              return (
                <ListingCard
                  key={listing.id}
                  listing={{
                    ...cardData,
                    status: cardData.status === "Active" ? "Available" : cardData.status,
                  }}
                  href={`/market/item/${listing.id}`}
                />
              );
            })}
          </div>
        ) : !loadError ? (
          <EmptyState
            title={selectedType === "all" ? "No active listings yet" : `No active ${formatMarketTypeLabel(selectedType).toLowerCase()} listings`}
            description={
              selectedType === "all"
                ? "Listings will appear here as soon as students post items."
                : `Listings in ${formatMarketTypeLabel(selectedType)} will appear here when available.`
            }
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
