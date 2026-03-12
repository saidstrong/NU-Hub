"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";

type ImageUploadPreviewProps = {
  name: string;
  label: string;
  accept?: string;
  multiple?: boolean;
  maxPreviewCount?: number;
  helperText?: string;
};

export function ImageUploadPreview({
  name,
  label,
  accept = "image/jpeg,image/png,image/webp",
  multiple = true,
  maxPreviewCount = 4,
  helperText,
}: ImageUploadPreviewProps) {
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const previousUrlsRef = useRef<string[]>([]);

  useEffect(() => {
    return () => {
      for (const url of previousUrlsRef.current) {
        URL.revokeObjectURL(url);
      }
    };
  }, []);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.currentTarget.files ?? []).slice(0, maxPreviewCount);
    const nextUrls = files.map((file) => URL.createObjectURL(file));

    for (const url of previousUrlsRef.current) {
      URL.revokeObjectURL(url);
    }

    previousUrlsRef.current = nextUrls;
    setPreviewUrls(nextUrls);
  }

  return (
    <div>
      <div className="mb-3 grid grid-cols-4 gap-2">
        {previewUrls.length > 0
          ? previewUrls.map((previewUrl, index) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={`${previewUrl}-${index}`}
                src={previewUrl}
                alt={`Selected upload ${index + 1}`}
                className="h-20 w-full rounded-xl border border-wire-700 bg-wire-900 object-cover"
              />
            ))
          : Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="wire-placeholder h-20" />
            ))}
      </div>

      <label className="block space-y-2">
        <span className="wire-label">{label}</span>
        <input
          name={name}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleChange}
          className="wire-input-field py-2.5"
        />
      </label>
      {helperText ? <p className="mt-2 wire-meta">{helperText}</p> : null}
    </div>
  );
}
