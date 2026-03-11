import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterRow } from "@/components/ui/FilterRow";
import { ListingCard } from "@/components/ui/ListingCard";
import { SearchBar } from "@/components/ui/SearchBar";
import { SectionCard } from "@/components/ui/SectionCard";
import { TagChip } from "@/components/ui/TagChip";
import { TopBar } from "@/components/ui/TopBar";
import { marketCategories } from "@/lib/mock-data";
import { getActiveListings, toListingCardData } from "@/lib/market/data";

export default async function MarketHomePage() {
  let listings: Awaited<ReturnType<typeof getActiveListings>> = [];
  let loadError: string | null = null;

  try {
    listings = await getActiveListings();
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Failed to load listings.";
  }

  return (
    <main className="relative">
      <TopBar
        title="Market"
        subtitle="Student marketplace for practical campus essentials"
        actions={[{ label: "My", href: "/market/my-listings" }, { label: "Saved", href: "/market/saved" }]}
      />

      <SearchBar placeholder="Search listings" />

      <section className="wire-panel">
        <p className="wire-section-title mb-1">Browse categories</p>
        <p className="mb-3 wire-meta">Find textbooks, electronics, dorm items, and more from NU students.</p>
        <div className="mb-3 flex flex-wrap gap-2">
          {marketCategories.map((category) => (
            <Link key={category} href={`/market/category/${category.toLowerCase()}`}>
              <TagChip label={category} />
            </Link>
          ))}
        </div>
        <FilterRow filters={["Newest", "Price", "Condition", "Pickup"]} />
      </section>

      <SectionCard title="Recent Listings" actionLabel="Saved items" actionHref="/market/saved">
        {loadError ? (
          <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-[13px] text-red-200">
            {loadError}
          </div>
        ) : null}
        {listings.length > 0 ? (
          <div className="wire-list">
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
      </SectionCard>

      <div className="pointer-events-none fixed bottom-[calc(6.75rem+env(safe-area-inset-bottom))] left-1/2 z-20 w-full max-w-md -translate-x-1/2 px-4">
        <Link
          href="/market/post"
          className="wire-action-primary pointer-events-auto ml-auto w-fit px-4 py-2 text-[13px]"
        >
          + Post listing
        </Link>
      </div>
    </main>
  );
}
