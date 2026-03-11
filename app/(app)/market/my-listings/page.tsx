import { EmptyState } from "@/components/ui/EmptyState";
import { ListingCard } from "@/components/ui/ListingCard";
import { TabRow } from "@/components/ui/TabRow";
import { TopBar } from "@/components/ui/TopBar";
import { getMyListings, toListingCardDataWithOptions } from "@/lib/market/data";

type MyListingsPageProps = {
  searchParams: Promise<{
    status?: string;
    message?: string;
  }>;
};

function parseStatus(value?: string): "active" | "reserved" | "sold" {
  if (value === "reserved" || value === "sold") return value;
  return "active";
}

export default async function MyListingsPage({ searchParams }: MyListingsPageProps) {
  const { status, message } = await searchParams;
  const selectedStatus = parseStatus(status);

  let listings: Awaited<ReturnType<typeof getMyListings>> = [];
  let loadError: string | null = null;

  try {
    listings = await getMyListings(selectedStatus);
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Failed to load your listings.";
  }

  const activeIndex = selectedStatus === "active" ? 0 : selectedStatus === "reserved" ? 1 : 2;

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
          { label: "Active", href: "/market/my-listings?status=active" },
          { label: "Reserved", href: "/market/my-listings?status=reserved" },
          { label: "Sold", href: "/market/my-listings?status=sold" },
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
    </main>
  );
}
