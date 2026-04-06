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
  const viewSummary = selectedStatus === "active"
    ? "Current includes live listings and drafts you can still edit or publish."
    : selectedStatus === "reserved"
      ? "Reserved listings are spoken for and waiting on pickup, handoff, or final confirmation."
      : "Sold listings are completed exchanges kept here for reference.";
  const emptyStateTitle = selectedStatus === "active"
    ? "No current listings yet"
    : selectedStatus === "reserved"
      ? "No reserved listings"
      : "No sold listings yet";
  const emptyStateDescription = selectedStatus === "active"
    ? "Live listings and saved drafts will appear here once you start posting."
    : selectedStatus === "reserved"
      ? "Listings move here after a buyer is arranged and before the exchange is finished."
      : "Completed listings move here after a sale or handoff is done.";
  const emptyStateActionLabel = selectedStatus === "active" ? "Post listing" : "View current listings";
  const emptyStateActionHref = selectedStatus === "active"
    ? "/market/post"
    : buildPageHref("/market/my-listings", 1, { status: "active" });

  return (
    <main>
      <TopBar
        title="My Listings"
        subtitle="Manage current, reserved, and sold listings"
        backHref="/market"
      />
      {message ? (
        <div className="rounded-xl border border-accent/35 bg-accent/10 px-3 py-2 text-[13px] text-wire-100">
          {message}
        </div>
      ) : null}

      <TabRow
        tabs={[
          { label: "Current", href: buildPageHref("/market/my-listings", 1, { status: "active" }) },
          { label: "Reserved", href: buildPageHref("/market/my-listings", 1, { status: "reserved" }) },
          { label: "Sold", href: buildPageHref("/market/my-listings", 1, { status: "sold" }) },
        ]}
        activeIndex={activeIndex}
      />

      <section className="wire-panel py-3">
        <p className="wire-label">Status view</p>
        <p className="mt-1 text-[13px] leading-relaxed text-wire-300">
          {viewSummary}
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
          title={emptyStateTitle}
          description={emptyStateDescription}
          actionLabel={emptyStateActionLabel}
          actionHref={emptyStateActionHref}
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
