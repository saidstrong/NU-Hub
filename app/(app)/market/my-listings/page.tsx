import { EmptyState } from "@/components/ui/EmptyState";
import { ListingCard } from "@/components/ui/ListingCard";
import { PageNavigation } from "@/components/ui/PageNavigation";
import { TabRow } from "@/components/ui/TabRow";
import { TopBar } from "@/components/ui/TopBar";
import { getMyListingsPage, toListingCardDataWithOptions } from "@/lib/market/data";
import { buildPageHref, parsePageParam } from "@/lib/pagination";

type MyListingsPageProps = {
  searchParams: Promise<{
    status?: string;
    message?: string;
    page?: string;
  }>;
};

const MY_LISTINGS_PAGE_SIZE = 12;

function parseStatus(value?: string): "active" | "reserved" | "sold" {
  if (value === "reserved" || value === "sold") return value;
  return "active";
}

export default async function MyListingsPage({ searchParams }: MyListingsPageProps) {
  const { status, message, page: pageParam } = await searchParams;
  const selectedStatus = parseStatus(status);
  const page = parsePageParam(pageParam);

  let listings: Awaited<ReturnType<typeof getMyListingsPage>>["listings"] = [];
  let hasMore = false;
  let loadError: string | null = null;

  try {
    const pagedListings = await getMyListingsPage(selectedStatus, page, MY_LISTINGS_PAGE_SIZE);
    listings = pagedListings.listings;
    hasMore = pagedListings.hasMore;
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Failed to load your listings.";
  }

  const activeIndex = selectedStatus === "active" ? 0 : selectedStatus === "reserved" ? 1 : 2;
  const previousHref = page > 1
    ? buildPageHref("/market/my-listings", page - 1, { status: selectedStatus })
    : undefined;
  const nextHref = hasMore
    ? buildPageHref("/market/my-listings", page + 1, { status: selectedStatus })
    : undefined;

  return (
    <main>
      <TopBar
        title="My Listings"
        subtitle="Track active, reserved, and sold items"
        backHref="/market"
      />
      {message ? (
        <div className="rounded-xl border border-accent/35 bg-accent/10 px-3 py-2 text-[13px] text-wire-100">
          {message}
        </div>
      ) : null}

      <TabRow
        tabs={[
          { label: "Active", href: buildPageHref("/market/my-listings", 1, { status: "active" }) },
          { label: "Reserved", href: buildPageHref("/market/my-listings", 1, { status: "reserved" }) },
          { label: "Sold", href: buildPageHref("/market/my-listings", 1, { status: "sold" }) },
        ]}
        activeIndex={activeIndex}
      />

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
              listing={toListingCardDataWithOptions(listing, { showStatus: true })}
              href={`/market/item/${listing.id}`}
            />
          ))}
        </div>
      ) : null}

      {listings.length === 0 && !loadError ? (
        <EmptyState
          title={`No ${selectedStatus} items yet`}
          description="Your listings will appear here once they match this status."
          actionLabel="Post item"
          actionHref="/market/post"
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
