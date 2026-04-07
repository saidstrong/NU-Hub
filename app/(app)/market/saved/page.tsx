import { EmptyState } from "@/components/ui/EmptyState";
import { ListingCard } from "@/components/ui/ListingCard";
import { PageNavigation } from "@/components/ui/PageNavigation";
import { TopBar } from "@/components/ui/TopBar";
import { toggleSavedListingAction } from "@/lib/market/actions";
import { getSavedListingsPage, toListingCardDataWithOptions } from "@/lib/market/data";
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
        subtitle="Your listing watchlist for revisiting details before you message or arrange pickup."
        backHref="/market"
      />
      <section className="wire-panel py-3">
        <p className="wire-label">Listing watchlist</p>
        <p className="mt-1 text-[13px] leading-relaxed text-wire-300">
          Saved listings keep current status visible so you can quickly see what is still active, what is reserved, and what has already sold.
        </p>
      </section>
      {loadError ? (
        <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-[13px] text-red-200">
          {loadError}
        </div>
      ) : null}

      {listings.length > 0 ? (
        <div className="wire-list">
          {listings.map((listing) => (
            <div key={listing.id}>
              <ListingCard
                listing={toListingCardDataWithOptions(listing, { showStatus: true })}
                href={`/market/item/${listing.id}`}
              />
              <div className="mt-2 flex items-center justify-between gap-3 px-1">
                <p className="text-[12px] text-wire-300">Open the listing to review current details and seller context.</p>
                <form action={toggleSavedListingAction}>
                  <input type="hidden" name="listingId" value={listing.id} />
                  <input type="hidden" name="redirectTo" value={currentPageHref} />
                  <button type="submit" className="wire-action-ghost min-h-9 px-2 text-[12px]">
                    Remove
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      ) : !loadError ? (
        <EmptyState
          title="No saved listings yet"
          description="Save a listing from Market when you want to revisit availability, price, or pickup details."
          actionLabel="Browse listings"
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
