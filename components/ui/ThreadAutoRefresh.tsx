"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

type ThreadAutoRefreshProps = {
  pauseWhenFocusedId?: string;
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
}: ThreadAutoRefreshProps) {
  const router = useRouter();

  useEffect(() => {
    const refreshIfAllowed = () => {
      if (document.visibilityState !== "visible") {
        return;
      }

      if (shouldPauseRefresh(pauseWhenFocusedId)) {
        return;
      }

      router.refresh();
    };

    window.addEventListener("focus", refreshIfAllowed);
    document.addEventListener("visibilitychange", refreshIfAllowed);

    return () => {
      window.removeEventListener("focus", refreshIfAllowed);
      document.removeEventListener("visibilitychange", refreshIfAllowed);
    };
  }, [pauseWhenFocusedId, router]);

  return null;
}
