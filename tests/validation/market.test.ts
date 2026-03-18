import { describe, expect, it } from "vitest";
import {
  isOwnerScopedListingImagePath,
  listingCreateSchema,
  parseUploadedListingImagePaths,
  listingMutationIdSchema,
  sendMarketplaceMessageSchema,
  startListingConversationSchema,
  listingUpdateSchema,
} from "@/lib/validation/market";

describe("market validation", () => {
  it("parses create input with draft/active status only", () => {
    const result = listingCreateSchema.safeParse({
      title: "TI-84 Plus Calculator",
      category: "Electronics",
      priceKzt: "19000",
      listingType: "sale",
      pricingModel: "fixed",
      condition: "Like new",
      description: "Barely used.",
      pickupLocation: "Main Library Lobby",
      status: "active",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.priceKzt).toBe(19000);
      expect(result.data.status).toBe("active");
    }
  });

  it("rejects sold status in create schema", () => {
    const result = listingCreateSchema.safeParse({
      title: "Desk Lamp",
      category: "Dorm",
      priceKzt: "4500",
      listingType: "sale",
      pricingModel: "fixed",
      condition: "Good",
      description: "",
      pickupLocation: "Block 20 Dorm",
      status: "sold",
    });

    expect(result.success).toBe(false);
  });

  it("accepts reserved status in update schema", () => {
    const result = listingUpdateSchema.safeParse({
      title: "Desk Lamp",
      category: "Dorm",
      priceKzt: "4500",
      listingType: "rental",
      pricingModel: "per_day",
      condition: "Good",
      description: "",
      pickupLocation: "Block 20 Dorm",
      status: "reserved",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("reserved");
      expect(result.data.description).toBeNull();
    }
  });

  it("enforces listing type and pricing model combinations", () => {
    const saleInvalid = listingCreateSchema.safeParse({
      title: "Desk Lamp",
      category: "Dorm",
      priceKzt: "4500",
      listingType: "sale",
      pricingModel: "per_day",
      condition: "Good",
      description: "",
      pickupLocation: "Block 20 Dorm",
      status: "active",
    });
    expect(saleInvalid.success).toBe(false);

    const rentalValid = listingCreateSchema.safeParse({
      title: "Camera Rental",
      category: "Electronics",
      priceKzt: "7000",
      listingType: "rental",
      pricingModel: "per_week",
      condition: "Good",
      description: "",
      pickupLocation: "Library",
      status: "active",
    });
    expect(rentalValid.success).toBe(true);

    const serviceValid = listingCreateSchema.safeParse({
      title: "Math tutoring",
      category: "Tutoring",
      priceKzt: "3500",
      listingType: "service",
      pricingModel: "per_hour",
      condition: "Experienced",
      description: "",
      pickupLocation: "Online",
      status: "active",
    });
    expect(serviceValid.success).toBe(true);
  });

  it("validates listing mutation id as uuid", () => {
    expect(
      listingMutationIdSchema.safeParse({
        listingId: "2aafeec7-6a08-4a79-9782-1f87f1f5a0f9",
      }).success,
    ).toBe(true);
    expect(listingMutationIdSchema.safeParse({ listingId: "invalid-id" }).success).toBe(false);
  });

  it("parses uploaded image paths payload", () => {
    const payload = JSON.stringify([
      "11111111-1111-4111-8111-111111111111/market/22222222-2222-4222-8222-222222222222/listing-33333333-3333-4333-8333-333333333333.jpg",
      "11111111-1111-4111-8111-111111111111/market/22222222-2222-4222-8222-222222222222/listing-44444444-4444-4444-8444-444444444444.webp",
    ]);

    const parsed = parseUploadedListingImagePaths(payload);

    expect(parsed.error).toBeNull();
    expect(parsed.paths).toHaveLength(2);
  });

  it("rejects invalid uploaded image path payload", () => {
    const parsed = parseUploadedListingImagePaths('["../../other-user/listing.png"]');
    expect(parsed.error).toBeTruthy();
    expect(parsed.paths).toHaveLength(0);
  });

  it("enforces owner namespace and market path pattern", () => {
    const userId = "11111111-1111-4111-8111-111111111111";
    const validPath =
      "11111111-1111-4111-8111-111111111111/market/22222222-2222-4222-8222-222222222222/listing-33333333-3333-4333-8333-333333333333.png";
    const foreignPath =
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/market/22222222-2222-4222-8222-222222222222/listing-33333333-3333-4333-8333-333333333333.png";
    const invalidExtPath =
      "11111111-1111-4111-8111-111111111111/market/22222222-2222-4222-8222-222222222222/listing-33333333-3333-4333-8333-333333333333.gif";

    expect(isOwnerScopedListingImagePath(validPath, userId)).toBe(true);
    expect(isOwnerScopedListingImagePath(foreignPath, userId)).toBe(false);
    expect(isOwnerScopedListingImagePath(invalidExtPath, userId)).toBe(false);
  });

  it("validates start conversation payload", () => {
    expect(
      startListingConversationSchema.safeParse({
        listingId: "2aafeec7-6a08-4a79-9782-1f87f1f5a0f9",
      }).success,
    ).toBe(true);

    expect(
      startListingConversationSchema.safeParse({
        listingId: "invalid-id",
      }).success,
    ).toBe(false);
  });

  it("validates send message payload with trimming and bounds", () => {
    const valid = sendMarketplaceMessageSchema.safeParse({
      conversationId: "2aafeec7-6a08-4a79-9782-1f87f1f5a0f9",
      content: "   Is this still available?   ",
    });

    expect(valid.success).toBe(true);
    if (valid.success) {
      expect(valid.data.content).toBe("Is this still available?");
    }

    const empty = sendMarketplaceMessageSchema.safeParse({
      conversationId: "2aafeec7-6a08-4a79-9782-1f87f1f5a0f9",
      content: "   ",
    });
    expect(empty.success).toBe(false);

    const tooLong = sendMarketplaceMessageSchema.safeParse({
      conversationId: "2aafeec7-6a08-4a79-9782-1f87f1f5a0f9",
      content: "a".repeat(1201),
    });
    expect(tooLong.success).toBe(false);
  });
});
