"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/cn";

type ListingImageGalleryProps = {
  images: string[];
  title: string;
  className?: string;
};

export function ListingImageGallery({ images, title, className }: ListingImageGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  useEffect(() => {
    if (activeIndex >= images.length) {
      setActiveIndex(0);
    }
  }, [activeIndex, images.length]);

  useEffect(() => {
    if (!isLightboxOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsLightboxOpen(false);
        return;
      }
      if (images.length < 2) return;
      if (event.key === "ArrowRight") {
        setActiveIndex((current) => (current + 1) % images.length);
      } else if (event.key === "ArrowLeft") {
        setActiveIndex((current) => (current - 1 + images.length) % images.length);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isLightboxOpen, images.length]);

  if (images.length === 0) {
    return null;
  }

  const activeImage = images[activeIndex] ?? images[0];
  const canNavigate = images.length > 1;

  return (
    <div className={cn("space-y-3", className)}>
      <button
        type="button"
        onClick={() => setIsLightboxOpen(true)}
        className="group relative block w-full overflow-hidden rounded-[var(--radius-input)] border border-wire-700 bg-wire-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
        aria-label="Open image fullscreen"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={activeImage}
          alt={`${title} image ${activeIndex + 1}`}
          className="h-[250px] w-full object-contain object-center sm:h-[360px]"
        />
        {canNavigate ? (
          <span className="absolute bottom-2 right-2 rounded-full border border-wire-600 bg-wire-900/80 px-2 py-0.5 text-[11px] text-wire-200">
            {activeIndex + 1} / {images.length}
          </span>
        ) : null}
      </button>

      {canNavigate ? (
        <div className="-mx-1 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:overflow-visible sm:px-0">
          {images.map((imageUrl, index) => {
            const isActive = index === activeIndex;

            return (
              <button
                key={`${imageUrl}-${index}`}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={cn(
                  "shrink-0 snap-start overflow-hidden rounded-[var(--radius-input)] border bg-wire-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35",
                  isActive ? "border-accent/45" : "border-wire-700",
                )}
                aria-label={`View image ${index + 1}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt={`${title} thumbnail ${index + 1}`}
                  className="h-20 w-28 object-cover object-center sm:h-20 sm:w-32"
                />
              </button>
            );
          })}
        </div>
      ) : null}

      {isLightboxOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-wire-950/95 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Image viewer"
          onClick={() => setIsLightboxOpen(false)}
        >
          <div
            className="relative w-full max-w-6xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsLightboxOpen(false)}
              className="absolute right-2 top-2 z-10 rounded-full border border-wire-600 bg-wire-900/90 p-2 text-wire-100 hover:border-wire-500"
              aria-label="Close image viewer"
            >
              <X className="h-4 w-4" />
            </button>

            {canNavigate ? (
              <>
                <button
                  type="button"
                  onClick={() => setActiveIndex((current) => (current - 1 + images.length) % images.length)}
                  className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full border border-wire-600 bg-wire-900/90 p-2 text-wire-100 hover:border-wire-500"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveIndex((current) => (current + 1) % images.length)}
                  className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full border border-wire-600 bg-wire-900/90 p-2 text-wire-100 hover:border-wire-500"
                  aria-label="Next image"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            ) : null}

            <div className="overflow-hidden rounded-[var(--radius-card)] border border-wire-700 bg-wire-950">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activeImage}
                alt={`${title} image ${activeIndex + 1}`}
                className="max-h-[82vh] w-full object-contain object-center"
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
