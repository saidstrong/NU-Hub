import { EmptyState } from "@/components/ui/EmptyState";
import { ListingCard } from "@/components/ui/ListingCard";
import { TopBar } from "@/components/ui/TopBar";
import { getActiveListingsByCategory, toListingCardData } from "@/lib/market/data";

type MarketCategoryPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function MarketCategoryPage({ params }: MarketCategoryPageProps) {
  const { slug } = await params;
  const categoryTitle = slug
    .replace(/-/g, " ")
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
  let listings: Awaited<ReturnType<typeof getActiveListingsByCategory>> = [];
  let loadError: string | null = null;

  try {
    listings = await getActiveListingsByCategory(categoryTitle, 100);
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Failed to load category listings.";
  }

  return (
    <main>
      <TopBar
        title={categoryTitle}
        subtitle="Category listings within the NU marketplace"
        backHref="/market"
      />
      {loadError ? (
        <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-[13px] text-red-200">
          {loadError}
        </div>
      ) : null}

      {listings.length > 0 ? (
        <div className="grid grid-cols-2 gap-2.5">
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
          title="No listings in this category"
          description="Try another category or check back later."
          actionLabel="Back to market"
          actionHref="/market"
        />
      ) : null}
    </main>
  );
}
