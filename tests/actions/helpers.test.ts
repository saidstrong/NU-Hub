import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

import {
  appendSearchParam,
  getStringArray,
  getStringValue,
  sanitizeInternalPath,
} from "@/lib/actions/helpers";

describe("action helpers", () => {
  it("reads string values safely from FormData", () => {
    const formData = new FormData();
    formData.append("title", "Laptop");

    expect(getStringValue(formData, "title")).toBe("Laptop");
    expect(getStringValue(formData, "missing")).toBe("");
  });

  it("reads trimmed string arrays and ignores empty values", () => {
    const formData = new FormData();
    formData.append("tags", " ai ");
    formData.append("tags", "  ");
    formData.append("tags", "robotics");

    expect(getStringArray(formData, "tags")).toEqual(["ai", "robotics"]);
  });

  it("sanitizes internal paths", () => {
    expect(sanitizeInternalPath("/connect/communities", "/home")).toBe(
      "/connect/communities",
    );
    expect(sanitizeInternalPath(undefined, "/home")).toBe("/home");
    expect(sanitizeInternalPath("https://evil.site", "/home")).toBe("/home");
    expect(sanitizeInternalPath("//evil.site", "/home")).toBe("/home");
  });

  it("appends and overwrites feedback query params", () => {
    const withMessage = appendSearchParam(
      "/connect?tab=people",
      "message",
      "Saved",
    );
    const [messagePath, messageQuery = ""] = withMessage.split("?");
    const messageParams = new URLSearchParams(messageQuery);

    expect(messagePath).toBe("/connect");
    expect(messageParams.get("tab")).toBe("people");
    expect(messageParams.get("message")).toBe("Saved");

    const withError = appendSearchParam("/connect?error=old", "error", "new");
    const [errorPath, errorQuery = ""] = withError.split("?");
    const errorParams = new URLSearchParams(errorQuery);

    expect(errorPath).toBe("/connect");
    expect(errorParams.get("error")).toBe("new");
  });
});
