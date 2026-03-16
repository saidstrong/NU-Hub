/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { CopyListingLinkButton } from "./CopyListingLinkButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { FeedbackBanner } from "@/components/ui/FeedbackBanner";
import { ListingImageGallery } from "@/components/ui/ListingImageGallery";
import { SectionCard } from "@/components/ui/SectionCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ShellButton } from "@/components/ui/ShellButton";
import { SubmitButton } from "@/components/ui/SubmitButton";
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
  const [{ message, error }, { id }] = await Promise.all([searchParams, params]);

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
  const listingImages = detail.imageUrls;
  const sellerMeta = [seller?.school, seller?.major, seller?.year_label]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(" - ");
  const sellerMetaLabel = sellerMeta || "Academic details not shared";
  const pickupLabel =
    typeof listing.pickup_location === "string" && listing.pickup_location.trim().length > 0
      ? listing.pickup_location.trim()
      : "Pickup details not specified";
  const descriptionLabel =
    typeof listing.description === "string" && listing.description.trim().length > 0
      ? listing.description.trim()
      : "No description provided.";
  const sellerAvatarUrl = toPublicStorageUrl("avatars", seller?.avatar_path);
  const postedDate = new Date(listing.created_at);
  const postedAtLabel = Number.isNaN(postedDate.getTime())
    ? "Recently posted"
    : postedDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <main>
      <section className="wire-panel">
        <SectionHeader
          title="Listing"
          actionNode={
            <Link href="/market" className="wire-link">
              Back to market
            </Link>
          }
        />
        <div className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-[28px] font-semibold leading-[34px] tracking-tight break-words text-wire-100">
                {listing.title}
              </h2>
              <p className="mt-1 text-[22px] font-semibold text-wire-100">{formatPriceKzt(listing.price_kzt)}</p>
            </div>
            <TagChip label={formatStatusLabel(listing.status)} tone="status" />
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-[var(--radius-input)] border border-wire-700 bg-wire-800 px-3 py-2">
              <p className="wire-label">Category</p>
              <p className="mt-1 text-sm text-wire-100">{listing.category}</p>
            </div>
            <div className="rounded-[var(--radius-input)] border border-wire-700 bg-wire-800 px-3 py-2">
              <p className="wire-label">Condition</p>
              <p className="mt-1 text-sm text-wire-100">{listing.condition}</p>
            </div>
            <div className="rounded-[var(--radius-input)] border border-wire-700 bg-wire-800 px-3 py-2">
              <p className="wire-label">Pickup</p>
              <p className="mt-1 text-sm text-wire-100">{pickupLabel}</p>
            </div>
            <div className="rounded-[var(--radius-input)] border border-wire-700 bg-wire-800 px-3 py-2">
              <p className="wire-label">Posted</p>
              <p className="mt-1 text-sm text-wire-100">{postedAtLabel}</p>
            </div>
          </div>
          <div className="rounded-[var(--radius-input)] border border-wire-700 bg-wire-800 px-3 py-2.5">
            <p className="wire-label">Description</p>
            <p className="mt-1 text-[14px] leading-relaxed text-wire-200">
              {descriptionLabel}
            </p>
          </div>
        </div>
      </section>

      {message ? <FeedbackBanner tone="success" message={message} /> : null}
      {error ? <FeedbackBanner tone="error" message={error} /> : null}

      <div className="grid gap-6 xl:grid-cols-[1.45fr_1fr]">
        <div className="space-y-6">
          {listingImages.length > 0 ? (
            <SectionCard title="Images" subtitle="Preview and item condition context.">
              <ListingImageGallery images={listingImages} title={listing.title} />
            </SectionCard>
          ) : (
            <div className="wire-inline-empty">No listing images uploaded.</div>
          )}
        </div>

        <div className="space-y-6">
          <SectionCard
            title="Seller"
            subtitle="Seller identity and campus context."
          >
            <Link
              href={`/connect/people/${listing.seller_id}`}
              className="block rounded-[var(--radius-input)] px-1 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
            >
              <div className="flex items-center gap-3 rounded-[var(--radius-input)] border border-wire-700 bg-wire-800 px-3 py-3">
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
                  <p className="text-[15px] text-wire-100">{seller?.full_name || "NU student"}</p>
                  <p className="mt-0.5 wire-meta">{sellerMetaLabel}</p>
                  <p className="mt-1 text-[12px] text-wire-400">View profile</p>
                </div>
              </div>
            </Link>
          </SectionCard>

          <section className="wire-panel">
            <SectionHeader title="Actions" />
            <div className="space-y-2.5">
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
                  <SubmitButton
                    label="Message seller"
                    pendingLabel="Opening chat..."
                    variant="primary"
                    className="w-full"
                  />
                </form>
              )}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <form action={toggleSavedListingAction} className="w-full">
                  <input type="hidden" name="listingId" value={listing.id} />
                  <input type="hidden" name="redirectTo" value={`/market/item/${listing.id}`} />
                  <SubmitButton
                    label={isSaved ? "Unsave" : "Save"}
                    pendingLabel={isSaved ? "Unsaving..." : "Saving..."}
                    className="w-full"
                  />
                </form>
                <CopyListingLinkButton href={`/market/item/${listing.id}`} />
              </div>
            </div>
            {!isOwner ? (
              <div className="mt-3">
                <form action={reportContentAction}>
                  <input type="hidden" name="targetType" value="listing" />
                  <input type="hidden" name="targetId" value={listing.id} />
                  <input type="hidden" name="reason" value="inappropriate" />
                  <input type="hidden" name="redirectTo" value={`/market/item/${listing.id}`} />
                  <SubmitButton
                    label="Report listing"
                    pendingLabel="Submitting..."
                    variant="ghost"
                    className="w-auto"
                  />
                </form>
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </main>
  );
}
