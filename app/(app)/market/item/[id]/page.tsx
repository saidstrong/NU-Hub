/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { TopBar } from "@/components/ui/TopBar";
import { notFound } from "next/navigation";
import { startListingConversationAction, toggleSavedListingAction } from "@/lib/market/actions";
import { reportContentAction } from "@/lib/moderation/actions";
import {
  formatPriceKzt,
  formatStatusLabel,
  getListingDetail,
} from "@/lib/market/data";
import { toPublicStorageUrl } from "@/lib/validation/media";
import { isUuid } from "@/lib/validation/uuid";

type MarketItemDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ message?: string; error?: string }>;
};

export default async function MarketItemDetailPage({
  params,
  searchParams,
}: MarketItemDetailPageProps) {
  const { message, error } = await searchParams;
  const { id } = await params;

  if (!isUuid(id)) {
    notFound();
  }

  let loadError: string | null = null;
  let detail: Awaited<ReturnType<typeof getListingDetail>> | null = null;

  try {
    detail = await getListingDetail(id);
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Failed to load listing.";
  }

  if (!detail || !detail.listing) {
    return (
      <main>
        <TopBar
          title="Listing"
          subtitle="Listing overview and seller information"
          backHref="/market"
        />
        {loadError ? (
          <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-[13px] text-red-200">
            {loadError}
          </div>
        ) : null}
        <EmptyState
          title="Listing not available"
          description="This listing may have been removed or is no longer visible."
          actionLabel="Back to market"
          actionHref="/market"
        />
      </main>
    );
  }

  const { listing, seller, isSaved, isOwner } = detail;
  const coverImageUrl = detail.imageUrls[0] ?? null;
  const extraImageUrls = detail.imageUrls.slice(1);
  const sellerMeta = [seller?.school, seller?.major, seller?.year_label]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(" - ");
  const sellerAvatarUrl = toPublicStorageUrl("avatars", seller?.avatar_path);

  return (
    <main>
      <TopBar
        title="Listing"
        subtitle="Listing overview and seller information"
        backHref="/market"
      />
      {message ? (
        <div className="rounded-xl border border-accent/35 bg-accent/10 px-3 py-2 text-[13px] text-wire-100">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-[13px] text-red-200">
          {error}
        </div>
      ) : null}

      {coverImageUrl ? (
        <section className="wire-panel">
          <img
            src={coverImageUrl}
            alt={listing.title}
            className="h-44 w-full rounded-xl border border-wire-700 bg-wire-900 object-cover"
          />
          {extraImageUrls.length > 0 ? (
            <div className="mt-2 grid grid-cols-4 gap-2">
              {extraImageUrls.map((imageUrl, index) => (
                <img
                  key={`${imageUrl}-${index}`}
                  src={imageUrl}
                  alt={`${listing.title} ${index + 2}`}
                  className="h-16 w-full rounded-xl border border-wire-700 bg-wire-900 object-cover"
                />
              ))}
            </div>
          ) : null}
        </section>
      ) : (
        <div className="wire-placeholder h-44" />
      )}

      <div className="wire-panel">
        <h2 className="text-[18px] font-semibold tracking-tight text-wire-100">{listing.title}</h2>
        <p className="mt-1 text-[15px] font-medium text-wire-200">{formatPriceKzt(listing.price_kzt)}</p>
        <div className="mt-3 space-y-1">
          <p className="wire-meta">Category: {listing.category}</p>
          <p className="wire-meta">Condition: {listing.condition}</p>
          <p className="wire-meta">Pickup: {listing.pickup_location}</p>
          <p className="wire-meta">Status: {formatStatusLabel(listing.status)}</p>
        </div>
      </div>

      <div className="wire-panel">
        <h3 className="mb-2 text-sm font-semibold text-wire-100">Description</h3>
        <p className="text-[13px] leading-relaxed text-wire-200">
          {listing.description || "No description provided."}
        </p>
      </div>

      <div className="wire-panel">
        <h3 className="mb-2 text-sm font-semibold text-wire-100">Seller</h3>
        <Link
          href={`/connect/people/${listing.seller_id}`}
          className="block rounded-xl px-1 py-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/40"
        >
          <div className="flex items-center gap-3">
            {sellerAvatarUrl ? (
              <img
                src={sellerAvatarUrl}
                alt={`${seller?.full_name || "Seller"} avatar`}
                className="h-10 w-10 rounded-full border border-wire-700 bg-wire-900 object-cover"
              />
            ) : (
              <div className="h-10 w-10 rounded-full border border-dashed border-wire-600 bg-wire-900" />
            )}
            <div>
              <p className="text-sm text-wire-100">{seller?.full_name || "NU student"}</p>
              <p className="wire-meta">{sellerMeta || "Campus seller profile"}</p>
            </div>
          </div>
        </Link>
      </div>

      <div className="wire-action-row">
        <form action={toggleSavedListingAction} className="w-full">
          <input type="hidden" name="listingId" value={listing.id} />
          <input type="hidden" name="redirectTo" value={`/market/item/${listing.id}`} />
          <button type="submit" className="wire-action w-full">
            {isSaved ? "Unsave listing" : "Save listing"}
          </button>
        </form>
        {isOwner ? (
          <Link href={`/market/item/${listing.id}/edit`} className="wire-action-primary w-full">
            Edit listing
          </Link>
        ) : (
          <form action={startListingConversationAction} className="w-full">
            <input type="hidden" name="listingId" value={listing.id} />
            <input type="hidden" name="redirectTo" value={`/market/item/${listing.id}`} />
            <button type="submit" className="wire-action-primary w-full">
              Message seller
            </button>
          </form>
        )}
      </div>
      {!isOwner ? (
        <div className="wire-action-row-single">
          <form action={reportContentAction}>
            <input type="hidden" name="targetType" value="listing" />
            <input type="hidden" name="targetId" value={listing.id} />
            <input type="hidden" name="reason" value="inappropriate" />
            <input type="hidden" name="redirectTo" value={`/market/item/${listing.id}`} />
            <button type="submit" className="wire-action-compact">
              Report listing
            </button>
          </form>
        </div>
      ) : null}
    </main>
  );
}
