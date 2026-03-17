/* eslint-disable @next/next/no-img-element */
import Link from "next/link";

export type ListingCardItem = {
  id: string;
  title: string;
  price: string;
  category: string;
  condition: string;
  location: string;
  status?: string;
  imageUrl?: string;
  highlightLabel?: string;
};

type ListingCardProps = {
  listing: ListingCardItem;
  href?: string;
};

export function ListingCard({ listing, href }: ListingCardProps) {
  const hasImage = typeof listing.imageUrl === "string" && listing.imageUrl.length > 0;
  const normalizedStatus = listing.status?.trim().toLowerCase();
  const statusClass =
    normalizedStatus === "available" || normalizedStatus === "active"
      ? "border-accent/35 bg-accent/10 text-wire-100"
      : normalizedStatus === "reserved"
        ? "border-amber-300/35 bg-amber-300/10 text-amber-100"
        : normalizedStatus === "sold"
          ? "border-wire-600 bg-wire-900 text-wire-300"
          : "border-wire-600 bg-wire-900 text-wire-300";
  const metadataLabel = [listing.category, listing.condition, listing.location]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(" • ");

  const content = (
    <div className="wire-card wire-hover">
      <div className="flex items-start gap-3.5">
        <div className="h-[92px] w-[116px] shrink-0 overflow-hidden rounded-[14px] border border-wire-700 bg-wire-900 sm:h-[100px] sm:w-[132px]">
          {hasImage ? (
            <img
              src={listing.imageUrl}
              alt={listing.title}
              className="h-full w-full bg-wire-900 object-contain p-1.5"
              loading="lazy"
            />
          ) : (
            <div className="wire-placeholder h-full w-full rounded-none border-0" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          {listing.highlightLabel ? (
            <span className="inline-flex rounded-full border border-accent/35 bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-wire-100">
              {listing.highlightLabel}
            </span>
          ) : null}
          <p
            className={`${listing.highlightLabel ? "mt-1 " : ""}line-clamp-2 text-sm font-semibold tracking-tight text-wire-100 [overflow-wrap:anywhere]`}
          >
            {listing.title}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-wire-100">{listing.price}</p>
            {listing.status ? (
              <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusClass}`}>
                {listing.status}
              </span>
            ) : null}
          </div>
          <p className="mt-2 line-clamp-2 text-[12px] text-wire-300">{metadataLabel || "Campus listing"}</p>
        </div>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block rounded-2xl focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/40"
      >
        {content}
      </Link>
    );
  }

  return content;
}
