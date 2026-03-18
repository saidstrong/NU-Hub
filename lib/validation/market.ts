import { z } from "zod";
import {
  IMAGE_ALLOWED_EXTENSIONS,
  IMAGE_ALLOWED_MIME_TYPES,
  LISTING_IMAGE_MAX_SIZE_BYTES as SHARED_LISTING_IMAGE_MAX_SIZE_BYTES,
} from "@/lib/validation/media";

export const LISTING_IMAGE_MAX_COUNT = 4;
export const LISTING_IMAGE_MAX_SIZE_BYTES = SHARED_LISTING_IMAGE_MAX_SIZE_BYTES;
export const LISTING_IMAGE_ALLOWED_MIME_TYPES = IMAGE_ALLOWED_MIME_TYPES;
export const LISTING_IMAGE_ALLOWED_EXTENSIONS = IMAGE_ALLOWED_EXTENSIONS;
export const LISTING_TYPE_VALUES = ["sale", "rental", "service"] as const;
export const PRICING_MODEL_VALUES = [
  "fixed",
  "per_day",
  "per_week",
  "per_month",
  "per_hour",
  "starting_from",
] as const;

type ListingTypeValue = (typeof LISTING_TYPE_VALUES)[number];
type PricingModelValue = (typeof PRICING_MODEL_VALUES)[number];

export const PRICING_MODELS_BY_LISTING_TYPE: Record<ListingTypeValue, readonly PricingModelValue[]> = {
  sale: ["fixed"],
  rental: ["per_day", "per_week", "per_month"],
  service: ["fixed", "per_hour", "starting_from"],
};

const listingBaseSchema = z.object({
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
  listingType: z.enum(LISTING_TYPE_VALUES),
  pricingModel: z.enum(PRICING_MODEL_VALUES),
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
}).superRefine((value, context) => {
  const allowedPricingModels = PRICING_MODELS_BY_LISTING_TYPE[value.listingType];
  if (allowedPricingModels.includes(value.pricingModel)) {
    return;
  }

  const message =
    value.listingType === "sale"
      ? "Sale listings must use Fixed pricing."
      : value.listingType === "rental"
        ? "Rental listings must use Per day, Per week, or Per month pricing."
        : "Service listings must use Fixed, Per hour, or Starting from pricing.";

  context.addIssue({
    code: z.ZodIssueCode.custom,
    path: ["pricingModel"],
    message,
  });
});

export const listingCreateSchema = listingBaseSchema.extend({
  status: z.enum(["draft", "active"]),
});

export const listingUpdateSchema = listingBaseSchema.extend({
  status: z.enum(["draft", "active", "reserved", "sold", "archived"]),
});

export const toggleSavedListingSchema = z.object({
  listingId: z.string().uuid("Invalid listing id."),
  redirectTo: z.string().optional(),
});

export const startListingConversationSchema = z.object({
  listingId: z.string().uuid("Invalid listing id."),
  redirectTo: z.string().optional(),
});

export const sendMarketplaceMessageSchema = z.object({
  conversationId: z.string().uuid("Invalid conversation id."),
  content: z
    .string()
    .trim()
    .min(1, "Message cannot be empty.")
    .max(1200, "Message is too long."),
  redirectTo: z.string().optional(),
});

export const listingMutationIdSchema = z.object({
  listingId: z.string().uuid("Invalid listing id."),
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

const listingUploadedImagePathSchema = z
  .string()
  .trim()
  .min(1, "Image path is required.")
  .max(300, "Image path is too long.")
  .refine((value) => !value.includes(".."), "Invalid image path.")
  .refine((value) => !value.includes("\\"), "Invalid image path.")
  .refine((value) => !value.includes("//"), "Invalid image path.")
  .refine((value) => {
    const extension = value.split(".").pop()?.toLowerCase() ?? "";
    return LISTING_IMAGE_ALLOWED_EXTENSIONS.includes(
      extension as (typeof LISTING_IMAGE_ALLOWED_EXTENSIONS)[number],
    );
  }, "Invalid image extension.");

export const listingUploadedImagePathsSchema = z
  .array(listingUploadedImagePathSchema)
  .max(LISTING_IMAGE_MAX_COUNT, `You can upload up to ${LISTING_IMAGE_MAX_COUNT} images.`);

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const UUID_PATTERN =
  "[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";

export function isOwnerScopedListingImagePath(path: string, userId: string): boolean {
  const pattern = new RegExp(
    `^${escapeRegExp(userId)}/market/${UUID_PATTERN}/listing-${UUID_PATTERN}\\.(?:jpg|jpeg|png|webp)$`,
    "i",
  );

  return pattern.test(path);
}

export function parseUploadedListingImagePaths(raw: string): {
  paths: string[];
  error: string | null;
} {
  if (!raw.trim()) {
    return { paths: [], error: null };
  }

  let parsedJson: unknown;

  try {
    parsedJson = JSON.parse(raw);
  } catch {
    return { paths: [], error: "Invalid uploaded image paths." };
  }

  const parsed = listingUploadedImagePathsSchema.safeParse(parsedJson);

  if (!parsed.success) {
    return {
      paths: [],
      error: parsed.error.issues[0]?.message ?? "Invalid uploaded image paths.",
    };
  }

  const dedupedPaths = Array.from(new Set(parsed.data));
  return { paths: dedupedPaths, error: null };
}

export type ListingCreateInput = z.infer<typeof listingCreateSchema>;
export type ListingUpdateInput = z.infer<typeof listingUpdateSchema>;
