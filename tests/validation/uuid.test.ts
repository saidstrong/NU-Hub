import { describe, expect, it } from "vitest";
import { isUuid } from "@/lib/validation/uuid";

describe("uuid validation helper", () => {
  it("returns true for valid UUIDs", () => {
    expect(isUuid("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
  });

  it("returns false for invalid UUIDs", () => {
    expect(isUuid("not-a-uuid")).toBe(false);
    expect(isUuid("550e8400-e29b-41d4-a716-44665544zzzz")).toBe(false);
  });
});
