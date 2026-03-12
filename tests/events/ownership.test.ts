import { describe, expect, it } from "vitest";
import { isEventOwner } from "@/lib/events/ownership";

describe("event ownership", () => {
  it("returns true when created_by matches auth user id", () => {
    expect(isEventOwner("2f3d8af2-8c5c-4a5f-896f-59d06f2cb337", "2f3d8af2-8c5c-4a5f-896f-59d06f2cb337")).toBe(true);
  });

  it("returns false for non-owner and null creator", () => {
    expect(isEventOwner("2f3d8af2-8c5c-4a5f-896f-59d06f2cb337", "0a6a47e9-2b3f-4f52-9ff7-83cd3414cc35")).toBe(false);
    expect(isEventOwner(null, "0a6a47e9-2b3f-4f52-9ff7-83cd3414cc35")).toBe(false);
  });
});
