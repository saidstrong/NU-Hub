"use client";

import { useEffect, useState } from "react";

type ListingViewCountProps = {
  listingId: string;
  initialCount: number;
  shouldTrack: boolean;
};

function formatCount(value: number): string {
  return new Intl.NumberFormat("en-US").format(Math.max(0, value));
}

export function ListingViewCount({ listingId, initialCount, shouldTrack }: ListingViewCountProps) {
  const [count, setCount] = useState(Math.max(0, initialCount));

  useEffect(() => {
    if (!shouldTrack) {
      return;
    }

    const abortController = new AbortController();
    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch(`/api/market/listings/${listingId}/view`, {
          method: "POST",
          cache: "no-store",
          signal: abortController.signal,
        });

        if (!response.ok || cancelled) {
          return;
        }

        const payload = (await response.json()) as {
          counted?: boolean;
          viewCount?: number | null;
        };

        if (payload.counted && typeof payload.viewCount === "number") {
          setCount(Math.max(0, payload.viewCount));
        }
      } catch {
        // Ignore view-tracking failures to avoid impacting detail-page UX.
      }
    })();

    return () => {
      cancelled = true;
      abortController.abort();
    };
  }, [listingId, shouldTrack]);

  return <p className="mt-1 text-sm text-wire-100">{formatCount(count)}</p>;
}
