import { describe, expect, it } from "vitest";
import {
  listingCreateSchema,
  listingMutationIdSchema,
  listingUpdateSchema,
} from "@/lib/validation/market";

describe("market validation", () => {
  it("parses create input with draft/active status only", () => {
    const result = listingCreateSchema.safeParse({
      title: "TI-84 Plus Calculator",
      category: "Electronics",
      priceKzt: "19000",
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

  it("validates listing mutation id as uuid", () => {
    expect(
      listingMutationIdSchema.safeParse({
        listingId: "2aafeec7-6a08-4a79-9782-1f87f1f5a0f9",
      }).success,
    ).toBe(true);
    expect(listingMutationIdSchema.safeParse({ listingId: "invalid-id" }).success).toBe(false);
  });
});
