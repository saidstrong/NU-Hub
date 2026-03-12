import { describe, expect, it } from "vitest";
import { isListingOwner } from "@/lib/market/ownership";

describe("listing ownership", () => {
  it("returns true when seller_id matches auth user id", () => {
    expect(
      isListingOwner(
        "9d8980af-f96b-4eab-a0f2-d44c1d1a5678",
        "9d8980af-f96b-4eab-a0f2-d44c1d1a5678",
      ),
    ).toBe(true);
  });

  it("returns false for non-owner", () => {
    expect(
      isListingOwner(
        "9d8980af-f96b-4eab-a0f2-d44c1d1a5678",
        "07dc2526-6a33-4c96-b62a-f457bd2f8d66",
      ),
    ).toBe(false);
  });
});
