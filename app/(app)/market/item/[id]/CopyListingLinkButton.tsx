"use client";

import { useState } from "react";

type CopyListingLinkButtonProps = {
  href: string;
  className?: string;
};

export function CopyListingLinkButton({ href, className = "wire-action w-full" }: CopyListingLinkButtonProps) {
  const [state, setState] = useState<"idle" | "copied" | "error">("idle");

  const handleCopy = async () => {
    const absoluteHref = new URL(href, window.location.origin).toString();

    try {
      await navigator.clipboard.writeText(absoluteHref);
      setState("copied");
    } catch {
      setState("error");
    }

    window.setTimeout(() => setState("idle"), 1800);
  };

  return (
    <button type="button" onClick={handleCopy} className={className}>
      {state === "copied" ? "Copied" : state === "error" ? "Copy failed" : "Copy link"}
    </button>
  );
}
