/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { FeedbackBanner } from "@/components/ui/FeedbackBanner";
import { SectionCard } from "@/components/ui/SectionCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ShellButton } from "@/components/ui/ShellButton";
import { TagChip } from "@/components/ui/TagChip";
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
        <section className="wire-panel">
          <SectionHeader
            title="Listing"
            subtitle="Listing overview and seller context."
            actionNode={
              <Link href="/market" className="wire-link">
                Back to market
              </Link>
            }
          />
        </section>
        {loadError ? <FeedbackBanner tone="error" message={loadError} /> : null}
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
    .join(" • ");
  const sellerAvatarUrl = toPublicStorageUrl("avatars", seller?.avatar_path);

  return (
    <main>
      <section className="wire-panel">
        <SectionHeader
          title="Listing"
          subtitle="Practical listing details and seller context."
          actionNode={
            <Link href="/market" className="wire-link">
              Back to market
            </Link>
          }
        />
        <h2 className="text-[28px] font-semibold leading-[34px] tracking-tight text-wire-100">{listing.title}</h2>
        <p className="mt-1 text-[20px] font-semibold text-wire-100">{formatPriceKzt(listing.price_kzt)}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <TagChip label={listing.category} active />
          <TagChip label={listing.condition} tone="status" />
          <TagChip label={formatStatusLabel(listing.status)} tone="status" />
        </div>
        <p className="mt-3 wire-meta">Pickup: {listing.pickup_location}</p>
      </section>

      {message ? <FeedbackBanner tone="success" message={message} /> : null}
      {error ? <FeedbackBanner tone="error" message={error} /> : null}

      {coverImageUrl ? (
        <SectionCard title="Images" subtitle="Preview and item condition context.">
          <img
            src={coverImageUrl}
            alt={listing.title}
            className="h-48 w-full rounded-[var(--radius-input)] border border-wire-700 bg-wire-900 object-cover"
          />
          {extraImageUrls.length > 0 ? (
            <div className="mt-3 grid grid-cols-4 gap-2">
              {extraImageUrls.map((imageUrl, index) => (
                <img
                  key={`${imageUrl}-${index}`}
                  src={imageUrl}
                  alt={`${listing.title} ${index + 2}`}
                  className="h-16 w-full rounded-[var(--radius-input)] border border-wire-700 bg-wire-900 object-cover"
                />
              ))}
            </div>
          ) : null}
        </SectionCard>
      ) : (
        <div className="wire-inline-empty">No listing images uploaded.</div>
      )}

      <SectionCard
        title="Description"
        subtitle="Seller-provided details for decision making."
      >
        <p className="text-[14px] leading-relaxed text-wire-200">
          {listing.description || "No description provided."}
        </p>
      </SectionCard>

      <SectionCard
        title="Seller"
        subtitle="Owner profile and campus context."
      >
        <Link
          href={`/connect/people/${listing.seller_id}`}
          className="block rounded-[var(--radius-input)] px-1 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
        >
          <div className="flex items-center gap-3 rounded-[var(--radius-input)] border border-wire-700 bg-wire-800 px-3 py-2.5">
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
      </SectionCard>

      <section className="wire-panel">
        <SectionHeader
          title="Actions"
          subtitle="Primary next step plus lightweight utilities."
        />
        <div className="wire-action-row">
          {isOwner ? (
            <ShellButton
              label="Edit listing"
              href={`/market/item/${listing.id}/edit`}
              variant="primary"
            />
          ) : (
            <form action={startListingConversationAction} className="w-full">
              <input type="hidden" name="listingId" value={listing.id} />
              <input type="hidden" name="redirectTo" value={`/market/item/${listing.id}`} />
              <button type="submit" className="wire-action-primary w-full">
                Message seller
              </button>
            </form>
          )}
          <form action={toggleSavedListingAction} className="w-full">
            <input type="hidden" name="listingId" value={listing.id} />
            <input type="hidden" name="redirectTo" value={`/market/item/${listing.id}`} />
            <button type="submit" className="wire-action w-full">
              {isSaved ? "Unsave listing" : "Save listing"}
            </button>
          </form>
        </div>
        {!isOwner ? (
          <div className="mt-3">
            <form action={reportContentAction}>
              <input type="hidden" name="targetType" value="listing" />
              <input type="hidden" name="targetId" value={listing.id} />
              <input type="hidden" name="reason" value="inappropriate" />
              <input type="hidden" name="redirectTo" value={`/market/item/${listing.id}`} />
              <button type="submit" className="wire-action-ghost">
                Report listing
              </button>
            </form>
          </div>
        ) : null}
      </section>
    </main>
  );
}
