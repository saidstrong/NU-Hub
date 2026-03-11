import { z } from "zod";

export const LISTING_IMAGE_MAX_COUNT = 4;
export const LISTING_IMAGE_MAX_SIZE_BYTES = 10 * 1024 * 1024;
export const LISTING_IMAGE_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const listingCreateSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Title is too short.")
    .max(120, "Title is too long."),
  category: z
    .string()
    .trim()
    .min(2, "Category is required.")
    .max(60, "Category is too long."),
  priceKzt: z.coerce
    .number()
    .int("Price must be a whole number.")
    .min(0, "Price cannot be negative.")
    .max(100_000_000, "Price is too high for MVP input."),
  condition: z
    .string()
    .trim()
    .min(2, "Condition is required.")
    .max(60, "Condition is too long."),
  description: z
    .string()
    .trim()
    .max(1500, "Description is too long.")
    .transform((value) => (value.length > 0 ? value : null)),
  pickupLocation: z
    .string()
    .trim()
    .min(2, "Pickup location is required.")
    .max(120, "Pickup location is too long."),
  status: z.enum(["draft", "active"]),
});

export const toggleSavedListingSchema = z.object({
  listingId: z.string().uuid("Invalid listing id."),
  redirectTo: z.string().optional(),
});

export const listingImageCountSchema = z
  .number()
  .int()
  .min(0)
  .max(LISTING_IMAGE_MAX_COUNT, `You can upload up to ${LISTING_IMAGE_MAX_COUNT} images.`);

export const listingImageMetaSchema = z.object({
  name: z.string().min(1, "Image file name is missing."),
  type: z.enum(LISTING_IMAGE_ALLOWED_MIME_TYPES, {
    error: "Only JPEG, PNG, and WEBP images are allowed.",
  }),
  size: z
    .number()
    .int()
    .min(1, "Image file is empty.")
    .max(LISTING_IMAGE_MAX_SIZE_BYTES, "Each image must be 10MB or less."),
});

export type ListingCreateInput = z.infer<typeof listingCreateSchema>;
