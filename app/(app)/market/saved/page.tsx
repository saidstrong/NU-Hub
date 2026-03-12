import { EmptyState } from "@/components/ui/EmptyState";
import { ListingCard } from "@/components/ui/ListingCard";
import { PageNavigation } from "@/components/ui/PageNavigation";
import { TopBar } from "@/components/ui/TopBar";
import { toggleSavedListingAction } from "@/lib/market/actions";
import { getSavedListingsPage, toListingCardData } from "@/lib/market/data";
import { buildPageHref, parsePageParam } from "@/lib/pagination";

type SavedListingsPageProps = {
  searchParams: Promise<{
    page?: string;
  }>;
};

const SAVED_LISTINGS_PAGE_SIZE = 12;

export default async function SavedListingsPage({ searchParams }: SavedListingsPageProps) {
  const { page: pageParam } = await searchParams;
  const page = parsePageParam(pageParam);

  let listings: Awaited<ReturnType<typeof getSavedListingsPage>>["listings"] = [];
  let hasMore = false;
  let loadError: string | null = null;

  try {
    const pagedListings = await getSavedListingsPage(page, SAVED_LISTINGS_PAGE_SIZE);
    listings = pagedListings.listings;
    hasMore = pagedListings.hasMore;
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Failed to load saved listings.";
  }

  const previousHref = page > 1 ? buildPageHref("/market/saved", page - 1) : undefined;
  const nextHref = hasMore ? buildPageHref("/market/saved", page + 1) : undefined;
  const currentPageHref = buildPageHref("/market/saved", page);

  return (
    <main>
      <TopBar
        title="Saved Listings"
        subtitle="Items bookmarked for later review"
        backHref="/market"
      />
      {loadError ? (
        <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-[13px] text-red-200">
          {loadError}
        </div>
      ) : null}

      {listings.length > 0 ? (
        <div className="wire-list">
          {listings.map((listing) => (
            <div key={listing.id}>
              <ListingCard listing={toListingCardData(listing)} href={`/market/item/${listing.id}`} />
              <form action={toggleSavedListingAction} className="mt-2">
                <input type="hidden" name="listingId" value={listing.id} />
                <input type="hidden" name="redirectTo" value={currentPageHref} />
                <button type="submit" className="wire-action w-full text-[12px]">
                  Remove from saved
                </button>
              </form>
            </div>
          ))}
        </div>
      ) : !loadError ? (
        <EmptyState
          title="No saved listings yet"
          description="Save listings from the market feed or listing detail to review later."
          actionLabel="Browse market"
          actionHref="/market"
        />
      ) : null}
      <PageNavigation
        previousHref={previousHref}
        nextHref={nextHref}
        previousLabel="Previous page"
        nextLabel="Next page"
      />
    </main>
  );
}
