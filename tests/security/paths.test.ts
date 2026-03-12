import { describe, expect, it } from "vitest";
import { isSafeInternalPath, sanitizeInternalPathValue } from "@/lib/security/paths";

describe("internal path security helpers", () => {
  it("accepts safe internal paths", () => {
    expect(isSafeInternalPath("/connect/communities")).toBe(true);
    expect(sanitizeInternalPathValue(" /events/123 ", "/home")).toBe("/events/123");
  });

  it("rejects unsafe redirect paths", () => {
    expect(isSafeInternalPath("https://evil.site")).toBe(false);
    expect(isSafeInternalPath("//evil.site")).toBe(false);
    expect(isSafeInternalPath("/%2F%2Fevil.site")).toBe(false);
    expect(isSafeInternalPath("/\\evil.site")).toBe(false);
    expect(isSafeInternalPath("/events/\nattack")).toBe(false);
    expect(sanitizeInternalPathValue("/%2F%2Fevil.site", "/home")).toBe("/home");
  });
});
