"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  LISTING_IMAGE_MAX_COUNT,
  LISTING_IMAGE_MAX_SIZE_BYTES,
  listingImageCountSchema,
} from "@/lib/validation/market";
import {
  IMAGE_ALLOWED_EXTENSIONS,
  createMediaFilename,
  hasValidImageSignature,
  validateImageFileMeta,
} from "@/lib/validation/media";

const LISTING_IMAGES_BUCKET = "listing-images";

function hasAllowedFileExtension(fileName: string): boolean {
  const extension = fileName.split(".").pop()?.toLowerCase();
  if (!extension) return false;

  return IMAGE_ALLOWED_EXTENSIONS.includes(
    extension as (typeof IMAGE_ALLOWED_EXTENSIONS)[number],
  );
}

export function DirectListingImageUpload() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [uploadedPaths, setUploadedPaths] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const previousPreviewUrlsRef = useRef<string[]>([]);

  useEffect(() => {
    const nextPreviewUrls = selectedFiles.map((file) => URL.createObjectURL(file));

    for (const previewUrl of previousPreviewUrlsRef.current) {
      URL.revokeObjectURL(previewUrl);
    }

    previousPreviewUrlsRef.current = nextPreviewUrls;
    setPreviewUrls(nextPreviewUrls);
  }, [selectedFiles]);

  useEffect(() => {
    return () => {
      for (const previewUrl of previousPreviewUrlsRef.current) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, []);

  async function removePathsBestEffort(paths: string[]) {
    if (paths.length === 0) return;
    const supabase = createClient();
    await supabase.storage.from(LISTING_IMAGES_BUCKET).remove(paths);
  }

  async function handleFileSelection(event: ChangeEvent<HTMLInputElement>) {
    const nextPickedFiles = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = "";

    if (nextPickedFiles.length === 0) {
      return;
    }

    const existingFileKeys = new Set(
      selectedFiles.map((file) => `${file.name}:${file.size}:${file.lastModified}`),
    );
    const uniquePickedFiles = nextPickedFiles.filter(
      (file) => !existingFileKeys.has(`${file.name}:${file.size}:${file.lastModified}`),
    );

    const remainingSlots = LISTING_IMAGE_MAX_COUNT - selectedFiles.length;

    if (remainingSlots <= 0) {
      setError(`You can upload up to ${LISTING_IMAGE_MAX_COUNT} images.`);
      return;
    }

    const filesToAdd = uniquePickedFiles.slice(0, remainingSlots);
    if (filesToAdd.length === 0) {
      setError("Duplicate images were skipped.");
      return;
    }

    const parsedCount = listingImageCountSchema.safeParse(selectedFiles.length + filesToAdd.length);
    if (!parsedCount.success) {
      setError(parsedCount.error.issues[0]?.message ?? "Invalid image count.");
      return;
    }

    for (const file of filesToAdd) {
      const imageMetaError = validateImageFileMeta(file, LISTING_IMAGE_MAX_SIZE_BYTES);
      if (imageMetaError) {
        setError(imageMetaError);
        return;
      }

      if (!hasAllowedFileExtension(file.name)) {
        setError("Only JPG, JPEG, PNG, and WEBP file extensions are allowed.");
        return;
      }
    }

    setError(null);
    setIsUploading(true);

    const supabase = createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      setIsUploading(false);
      setError("Please sign in again before uploading images.");
      return;
    }

    const userId = authData.user.id;
    const uploadBatchId = crypto.randomUUID();
    const nextPaths: string[] = [];

    for (const file of filesToAdd) {
      const hasValidSignature = await hasValidImageSignature(file);
      if (!hasValidSignature) {
        await removePathsBestEffort(nextPaths);
        setIsUploading(false);
        setError("Invalid image content. Upload JPEG, PNG, or WEBP files only.");
        return;
      }

      const storagePath = `${userId}/market/${uploadBatchId}/${createMediaFilename("listing", file)}`;
      const { error: uploadError } = await supabase.storage
        .from(LISTING_IMAGES_BUCKET)
        .upload(storagePath, file, {
          upsert: false,
          contentType: file.type,
        });

      if (uploadError) {
        await removePathsBestEffort(nextPaths);
        setIsUploading(false);
        setError("Failed to upload one or more images. Please try again.");
        return;
      }

      nextPaths.push(storagePath);
    }

    setSelectedFiles((prev) => [...prev, ...filesToAdd].slice(0, LISTING_IMAGE_MAX_COUNT));
    setUploadedPaths((prev) => [...prev, ...nextPaths].slice(0, LISTING_IMAGE_MAX_COUNT));
    const skippedForDuplicates = uniquePickedFiles.length !== nextPickedFiles.length;
    const skippedForLimit = uniquePickedFiles.length > filesToAdd.length;
    if (skippedForLimit) {
      setError(`You can upload up to ${LISTING_IMAGE_MAX_COUNT} images.`);
    } else if (skippedForDuplicates) {
      setError("Duplicate images were skipped.");
    } else {
      setError(null);
    }
    setIsUploading(false);
  }

  return (
    <div className="space-y-2">
      <div className="mb-3 grid grid-cols-4 gap-2">
        {selectedFiles.length > 0
          ? selectedFiles.map((file, index) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
                src={previewUrls[index]}
                alt={`Selected image ${index + 1}`}
                className="h-20 w-full rounded-xl border border-wire-700 bg-wire-900 object-cover"
              />
            ))
          : Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="wire-placeholder h-20" />
            ))}
      </div>

      <label className="block space-y-2">
        <span className="wire-label">Listing images (optional)</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={handleFileSelection}
          className="wire-input-field py-2.5"
          disabled={isUploading}
        />
      </label>
      <p className="wire-meta">Up to {LISTING_IMAGE_MAX_COUNT} images. JPEG, PNG, WEBP.</p>
      {isUploading ? <p className="wire-meta">Uploading images...</p> : null}
      {!isUploading && uploadedPaths.length > 0 ? (
        <p className="wire-meta">Uploaded {uploadedPaths.length} image(s).</p>
      ) : null}
      {error ? (
        <p className="text-[13px] text-red-200">{error}</p>
      ) : null}

      <input type="hidden" name="uploadedImagePaths" value={JSON.stringify(uploadedPaths)} />
    </div>
  );
}
