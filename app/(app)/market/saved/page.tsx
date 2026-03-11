import { EmptyState } from "@/components/ui/EmptyState";
import { ListingCard } from "@/components/ui/ListingCard";
import { TopBar } from "@/components/ui/TopBar";
import { toggleSavedListingAction } from "@/lib/market/actions";
import { getSavedListings, toListingCardData } from "@/lib/market/data";

export default async function SavedListingsPage() {
  let listings: Awaited<ReturnType<typeof getSavedListings>> = [];
  let loadError: string | null = null;

  try {
    listings = await getSavedListings();
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Failed to load saved listings.";
  }

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
                <input type="hidden" name="redirectTo" value="/market/saved" />
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
    </main>
  );
}
