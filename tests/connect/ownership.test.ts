import { describe, expect, it } from "vitest";
import { isCommunityOwner } from "@/lib/connect/ownership";

describe("community ownership", () => {
  it("returns true when created_by matches auth user id", () => {
    expect(
      isCommunityOwner(
        "cdd2bf34-a4cf-4130-a46f-be2e09159ea3",
        "cdd2bf34-a4cf-4130-a46f-be2e09159ea3",
      ),
    ).toBe(true);
  });

  it("returns false for non-owner", () => {
    expect(
      isCommunityOwner(
        "cdd2bf34-a4cf-4130-a46f-be2e09159ea3",
        "4f915bd5-af95-4fa7-8757-35b5f7be8ef4",
      ),
    ).toBe(false);
  });
});
