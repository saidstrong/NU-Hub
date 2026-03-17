"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

type ThreadAutoRefreshProps = {
  pauseWhenFocusedId?: string;
  minIntervalMs?: number;
};

function shouldPauseRefresh(pauseWhenFocusedId?: string): boolean {
  if (!pauseWhenFocusedId) {
    return false;
  }

  if (typeof document === "undefined") {
    return false;
  }

  const activeElement = document.activeElement;
  return activeElement instanceof HTMLElement && activeElement.id === pauseWhenFocusedId;
}

export function ThreadAutoRefresh({
  pauseWhenFocusedId,
  minIntervalMs = 15000,
}: ThreadAutoRefreshProps) {
  const router = useRouter();
  const lastRefreshAtRef = useRef(0);

  useEffect(() => {
    const refreshIfAllowed = () => {
      if (document.visibilityState !== "visible") {
        return;
      }

      if (shouldPauseRefresh(pauseWhenFocusedId)) {
        return;
      }

      const now = Date.now();
      if (now - lastRefreshAtRef.current < minIntervalMs) {
        return;
      }

      lastRefreshAtRef.current = now;
      router.refresh();
    };

    window.addEventListener("focus", refreshIfAllowed);
    document.addEventListener("visibilitychange", refreshIfAllowed);

    return () => {
      window.removeEventListener("focus", refreshIfAllowed);
      document.removeEventListener("visibilitychange", refreshIfAllowed);
    };
  }, [minIntervalMs, pauseWhenFocusedId, router]);

  return null;
}
