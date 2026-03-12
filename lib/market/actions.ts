"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  getStringValue,
  redirectWithError,
  redirectWithMessage,
  sanitizeInternalPath,
} from "@/lib/actions/helpers";
import { requireUser } from "@/lib/auth/session";
import { isListingOwner } from "@/lib/market/ownership";
import { getCurrentProfile } from "@/lib/profile/data";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { createClient } from "@/lib/supabase/server";
import {
  LISTING_IMAGE_ALLOWED_MIME_TYPES,
  listingImageCountSchema,
  listingImageMetaSchema,
  listingCreateSchema,
  listingMutationIdSchema,
  listingUpdateSchema,
  toggleSavedListingSchema,
} from "@/lib/validation/market";

const LISTING_IMAGES_BUCKET = "listing-images";
const CREATE_LISTING_BURST_LIMIT = {
  maxHits: 1,
  windowMs: 10 * 1000,
};
const CREATE_LISTING_WINDOW_LIMIT = {
  maxHits: 12,
  windowMs: 15 * 60 * 1000,
};
const UPDATE_LISTING_LIMIT = {
  maxHits: 30,
  windowMs: 15 * 60 * 1000,
};
const DELETE_LISTING_LIMIT = {
  maxHits: 8,
  windowMs: 30 * 60 * 1000,
};

function getFileValue(formData: FormData, key: string): File[] {
  return formData
    .getAll(key)
    .filter((value): value is File => value instanceof File && value.size > 0);
}

function mapCreateListingErrorMessage(errorCode?: string): string {
  if (errorCode === "23503") {
    return "Your profile is not ready yet. Open your profile once and try again.";
  }

  return "Failed to create listing. Please try again.";
}

function mapUpdateListingErrorMessage(errorCode?: string): string {
  if (errorCode === "42501") {
    return "You do not have permission to edit this listing.";
  }

  return "Failed to update listing. Please try again.";
}

function mapDeleteListingErrorMessage(errorCode?: string): string {
  if (errorCode === "42501") {
    return "You do not have permission to delete this listing.";
  }

  return "Failed to delete listing. Please try again.";
}

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

function revalidateListingPaths(listingId: string) {
  revalidatePath("/home");
  revalidatePath("/market");
  revalidatePath("/market/my-listings");
  revalidatePath("/market/saved");
  revalidatePath(`/market/item/${listingId}`);
  revalidatePath(`/market/item/${listingId}/edit`);
}

async function verifyListingOwnershipOrRedirect(
  supabase: SupabaseServerClient,
  listingId: string,
  userId: string,
  onErrorPath: string,
) {
  const { data: listing, error } = await supabase
    .from("listings")
    .select("id, seller_id")
    .eq("id", listingId)
    .maybeSingle();

  if (error) {
    redirectWithError(onErrorPath, "Failed to load listing.");
  }

  if (!listing) {
    redirectWithError(onErrorPath, "Listing not found.");
  }

  if (!isListingOwner(listing.seller_id, userId)) {
    redirectWithError(onErrorPath, "You can only manage your own listings.");
  }
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

async function hasMatchingImageSignature(file: File): Promise<boolean> {
  const signature = new Uint8Array(await file.slice(0, 12).arrayBuffer());

  if (file.type === "image/jpeg") {
    return signature.length >= 3 && signature[0] === 0xff && signature[1] === 0xd8 && signature[2] === 0xff;
  }

  if (file.type === "image/png") {
    return (
      signature.length >= 8 &&
      signature[0] === 0x89 &&
      signature[1] === 0x50 &&
      signature[2] === 0x4e &&
      signature[3] === 0x47 &&
      signature[4] === 0x0d &&
      signature[5] === 0x0a &&
      signature[6] === 0x1a &&
      signature[7] === 0x0a
    );
  }

  if (file.type === "image/webp") {
    return (
      signature.length >= 12 &&
      signature[0] === 0x52 &&
      signature[1] === 0x49 &&
      signature[2] === 0x46 &&
      signature[3] === 0x46 &&
      signature[8] === 0x57 &&
      signature[9] === 0x45 &&
      signature[10] === 0x42 &&
      signature[11] === 0x50
    );
  }

  return false;
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

  const user = await requireUser();
  const burstRateResult = consumeRateLimit(
    `market:create-listing:burst:${user.id}`,
    CREATE_LISTING_BURST_LIMIT,
  );
  const windowRateResult = consumeRateLimit(
    `market:create-listing:window:${user.id}`,
    CREATE_LISTING_WINDOW_LIMIT,
  );

  if (!burstRateResult.allowed || !windowRateResult.allowed) {
    redirectWithError("/market/post", "Too many listing submissions. Please wait and try again.");
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

    const hasValidSignature = await hasMatchingImageSignature(file);
    if (!hasValidSignature) {
      redirectWithError("/market/post", "Invalid image content. Upload JPEG, PNG, or WEBP files only.");
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

export async function updateListingAction(formData: FormData) {
  const parsedListingId = listingMutationIdSchema.safeParse({
    listingId: getStringValue(formData, "listingId"),
  });

  if (!parsedListingId.success) {
    redirectWithError("/market", parsedListingId.error.issues[0]?.message ?? "Invalid listing id.");
  }

  const listingId = parsedListingId.data.listingId;
  const editPath = `/market/item/${listingId}/edit`;
  const parsed = listingUpdateSchema.safeParse({
    title: getStringValue(formData, "title"),
    category: getStringValue(formData, "category"),
    priceKzt: getStringValue(formData, "priceKzt"),
    condition: getStringValue(formData, "condition"),
    description: getStringValue(formData, "description"),
    pickupLocation: getStringValue(formData, "pickupLocation"),
    status: getStringValue(formData, "status"),
  });

  if (!parsed.success) {
    redirectWithError(editPath, parsed.error.issues[0]?.message ?? "Invalid listing input.");
  }

  const user = await requireUser();
  const updateRateResult = consumeRateLimit(`market:update-listing:${user.id}`, UPDATE_LISTING_LIMIT);

  if (!updateRateResult.allowed) {
    redirectWithError(editPath, "Too many update attempts. Please wait and try again.");
  }

  const supabase = await createClient();
  await verifyListingOwnershipOrRedirect(supabase, listingId, user.id, editPath);

  const { data: updated, error: updateError } = await supabase
    .from("listings")
    .update({
      title: parsed.data.title,
      description: parsed.data.description,
      price_kzt: parsed.data.priceKzt,
      category: parsed.data.category,
      condition: parsed.data.condition,
      pickup_location: parsed.data.pickupLocation,
      status: parsed.data.status,
    })
    .eq("id", listingId)
    .eq("seller_id", user.id)
    .select("id")
    .maybeSingle();

  if (updateError) {
    redirectWithError(editPath, mapUpdateListingErrorMessage(updateError.code));
  }

  if (!updated) {
    redirectWithError(editPath, "Listing not found.");
  }

  revalidateListingPaths(listingId);
  redirectWithMessage(`/market/item/${listingId}`, "Listing updated");
}

export async function deleteListingAction(formData: FormData) {
  const parsed = listingMutationIdSchema.safeParse({
    listingId: getStringValue(formData, "listingId"),
  });

  if (!parsed.success) {
    redirectWithError("/market", parsed.error.issues[0]?.message ?? "Invalid listing id.");
  }

  const listingId = parsed.data.listingId;
  const editPath = `/market/item/${listingId}/edit`;
  const user = await requireUser();
  const deleteRateResult = consumeRateLimit(`market:delete-listing:${user.id}`, DELETE_LISTING_LIMIT);

  if (!deleteRateResult.allowed) {
    redirectWithError(editPath, "Too many delete attempts. Please wait and try again.");
  }

  const supabase = await createClient();
  await verifyListingOwnershipOrRedirect(supabase, listingId, user.id, editPath);

  const { data: deleted, error: deleteError } = await supabase
    .from("listings")
    .delete()
    .eq("id", listingId)
    .eq("seller_id", user.id)
    .select("id")
    .maybeSingle();

  if (deleteError) {
    redirectWithError(editPath, mapDeleteListingErrorMessage(deleteError.code));
  }

  if (!deleted) {
    redirectWithError(editPath, "Listing not found.");
  }

  revalidateListingPaths(listingId);
  redirectWithMessage("/market/my-listings", "Listing deleted");
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

    if (insertError?.code === "23505") {
      const redirectTo = sanitizeInternalPath(
        parsed.data.redirectTo,
        `/market/item/${parsed.data.listingId}`,
      );
      redirect(redirectTo);
    }

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
