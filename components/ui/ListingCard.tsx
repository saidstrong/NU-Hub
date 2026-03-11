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
};

type ListingCardProps = {
  listing: ListingCardItem;
  href?: string;
};

export function ListingCard({ listing, href }: ListingCardProps) {
  const hasImage = typeof listing.imageUrl === "string" && listing.imageUrl.length > 0;

  const content = (
    <div className="wire-card wire-hover">
      <div className="flex items-start gap-3">
        {hasImage ? (
          <img
            src={listing.imageUrl}
            alt={listing.title}
            className="h-[76px] w-[76px] shrink-0 rounded-xl border border-wire-700 bg-wire-900 object-cover"
            loading="lazy"
          />
        ) : (
          <div className="wire-placeholder h-[76px] w-[76px] shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-start justify-between gap-2">
            <p className="line-clamp-2 text-sm font-semibold tracking-tight text-wire-100">
              {listing.title}
            </p>
            <p className="shrink-0 text-sm font-semibold text-wire-100">{listing.price}</p>
          </div>
          <p className="mb-2 wire-meta">{listing.category}</p>
          <div className="flex flex-wrap gap-1.5">
            {listing.status ? (
              <span className="rounded-xl border border-accent/30 bg-accent/10 px-2 py-1 text-[12px] text-wire-200">
                {listing.status}
              </span>
            ) : null}
            <span className="rounded-xl border border-wire-600 bg-wire-900 px-2 py-1 text-[12px] text-wire-300">
              {listing.condition}
            </span>
            <span className="rounded-xl border border-wire-600 bg-wire-900 px-2 py-1 text-[12px] text-wire-300">
              {listing.location}
            </span>
          </div>
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
