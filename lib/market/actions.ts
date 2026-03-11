"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getCurrentProfile } from "@/lib/profile/data";
import { createClient } from "@/lib/supabase/server";
import {
  LISTING_IMAGE_ALLOWED_MIME_TYPES,
  listingImageCountSchema,
  listingImageMetaSchema,
  listingCreateSchema,
  toggleSavedListingSchema,
} from "@/lib/validation/market";

const LISTING_IMAGES_BUCKET = "listing-images";

function getStringValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function getFileValue(formData: FormData, key: string): File[] {
  return formData
    .getAll(key)
    .filter((value): value is File => value instanceof File && value.size > 0);
}

function sanitizeInternalPath(path: string | undefined, fallback: string): string {
  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return fallback;
  }

  return path;
}

function redirectWithError(path: string, message: string): never {
  const params = new URLSearchParams({ error: message });
  redirect(`${path}?${params.toString()}`);
}

function mapCreateListingErrorMessage(errorCode?: string): string {
  if (errorCode === "23503") {
    return "Your profile is not ready yet. Open your profile once and try again.";
  }

  return "Failed to create listing. Please try again.";
}

function getImageExtension(file: File): string {
  const filenameExtension = file.name.split(".").pop()?.toLowerCase();
  if (filenameExtension === "jpg" || filenameExtension === "jpeg") return "jpg";
  if (filenameExtension === "png") return "png";
  if (filenameExtension === "webp") return "webp";

  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

async function cleanupFailedListingWithImages(
  supabase: Awaited<ReturnType<typeof createClient>>,
  listingId: string,
  uploadedPaths: string[],
) {
  if (uploadedPaths.length > 0) {
    await supabase.storage.from(LISTING_IMAGES_BUCKET).remove(uploadedPaths);
  }

  await supabase
    .from("listing_images")
    .delete()
    .eq("listing_id", listingId);

  await supabase
    .from("listings")
    .delete()
    .eq("id", listingId);
}

async function createListingWithStatus(formData: FormData, status: "draft" | "active") {
  const parsed = listingCreateSchema.safeParse({
    title: getStringValue(formData, "title"),
    category: getStringValue(formData, "category"),
    priceKzt: getStringValue(formData, "priceKzt"),
    condition: getStringValue(formData, "condition"),
    description: getStringValue(formData, "description"),
    pickupLocation: getStringValue(formData, "pickupLocation"),
    status,
  });

  if (!parsed.success) {
    redirectWithError("/market/post", parsed.error.issues[0]?.message ?? "Invalid listing input.");
  }

  const imageFiles = getFileValue(formData, "images");
  const parsedImageCount = listingImageCountSchema.safeParse(imageFiles.length);

  if (!parsedImageCount.success) {
    redirectWithError("/market/post", parsedImageCount.error.issues[0]?.message ?? "Invalid image count.");
  }

  for (const file of imageFiles) {
    const parsedImageMeta = listingImageMetaSchema.safeParse({
      name: file.name,
      type: file.type,
      size: file.size,
    });

    if (!parsedImageMeta.success) {
      redirectWithError("/market/post", parsedImageMeta.error.issues[0]?.message ?? "Invalid image input.");
    }

    if (!LISTING_IMAGE_ALLOWED_MIME_TYPES.includes(parsedImageMeta.data.type)) {
      redirectWithError("/market/post", "Only JPEG, PNG, and WEBP images are allowed.");
    }
  }

  let sellerId: string;

  try {
    const profile = await getCurrentProfile();
    sellerId = profile.user_id;
  } catch {
    redirectWithError(
      "/market/post",
      "Unable to load your profile. Please complete profile setup and try again.",
    );
  }

  const supabase = await createClient();

  const { data: created, error } = await supabase
    .from("listings")
    .insert({
      seller_id: sellerId,
      title: parsed.data.title,
      description: parsed.data.description,
      price_kzt: parsed.data.priceKzt,
      category: parsed.data.category,
      condition: parsed.data.condition,
      pickup_location: parsed.data.pickupLocation,
      status: parsed.data.status,
    })
    .select("id")
    .single();

  if (error || !created) {
    redirectWithError("/market/post", mapCreateListingErrorMessage(error?.code));
  }

  if (imageFiles.length > 0) {
    const uploadedPaths: string[] = [];
    const listingImageRows: Array<{
      listing_id: string;
      storage_path: string;
      sort_order: number;
    }> = [];

    for (const [index, file] of imageFiles.entries()) {
      const extension = getImageExtension(file);
      const storagePath = `${sellerId}/${created.id}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from(LISTING_IMAGES_BUCKET)
        .upload(storagePath, file, {
          upsert: false,
          contentType: file.type,
        });

      if (uploadError) {
        await cleanupFailedListingWithImages(supabase, created.id, uploadedPaths);
        redirectWithError(
          "/market/post",
          "Failed to upload listing images. Listing was not created. Please try again.",
        );
      }

      uploadedPaths.push(storagePath);
      listingImageRows.push({
        listing_id: created.id,
        storage_path: storagePath,
        sort_order: index,
      });
    }

    const { error: imageRowsError } = await supabase
      .from("listing_images")
      .insert(listingImageRows);

    if (imageRowsError) {
      await cleanupFailedListingWithImages(supabase, created.id, uploadedPaths);
      redirectWithError(
        "/market/post",
        "Failed to save listing images. Listing was not created. Please try again.",
      );
    }
  }

  revalidatePath("/market");
  revalidatePath("/market/my-listings");
  revalidatePath("/market/saved");
  revalidatePath(`/market/item/${created.id}`);

  if (status === "draft") {
    redirect("/market/my-listings?status=active&message=Draft%20saved");
  }

  redirect(`/market/item/${created.id}?message=Listing%20published`);
}

export async function saveDraftListingAction(formData: FormData) {
  await createListingWithStatus(formData, "draft");
}

export async function publishListingAction(formData: FormData) {
  await createListingWithStatus(formData, "active");
}

export async function toggleSavedListingAction(formData: FormData) {
  const parsed = toggleSavedListingSchema.safeParse({
    listingId: getStringValue(formData, "listingId"),
    redirectTo: getStringValue(formData, "redirectTo"),
  });

  if (!parsed.success) {
    redirectWithError("/market", parsed.error.issues[0]?.message ?? "Invalid save request.");
  }

  const user = await requireUser();
  const supabase = await createClient();

  const { data: existing, error: existingError } = await supabase
    .from("saved_listings")
    .select("listing_id")
    .eq("user_id", user.id)
    .eq("listing_id", parsed.data.listingId)
    .maybeSingle();

  if (existingError) {
    redirectWithError("/market", "Failed to check saved listing.");
  }

  if (existing) {
    const { error: deleteError } = await supabase
      .from("saved_listings")
      .delete()
      .eq("user_id", user.id)
      .eq("listing_id", parsed.data.listingId);

    if (deleteError) {
      redirectWithError("/market", "Failed to unsave listing.");
    }
  } else {
    const { error: insertError } = await supabase
      .from("saved_listings")
      .insert({
        user_id: user.id,
        listing_id: parsed.data.listingId,
      });

    if (insertError) {
      redirectWithError("/market", "Failed to save listing.");
    }
  }

  revalidatePath("/market");
  revalidatePath("/market/saved");
  revalidatePath(`/market/item/${parsed.data.listingId}`);

  const redirectTo = sanitizeInternalPath(
    parsed.data.redirectTo,
    `/market/item/${parsed.data.listingId}`,
  );

  redirect(redirectTo);
}
