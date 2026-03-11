import { describe, expect, it } from "vitest";
import {
  SEARCH_MIN_QUERY_LENGTH,
  parseSearchQueryParam,
  sanitizeSearchQuery,
  toIlikePattern,
} from "@/lib/validation/search";

describe("search validation", () => {
  it("sanitizes punctuation and collapses whitespace", () => {
    expect(sanitizeSearchQuery("  %hello_world;  ")).toBe("hello world");
  });

  it("returns empty query without error for blank input", () => {
    expect(parseSearchQueryParam("   ")).toEqual({
      query: "",
      error: null,
    });
  });

  it("rejects too-short search query after sanitization", () => {
    const result = parseSearchQueryParam("%;");

    expect(result.query).toBe("");
    expect(result.error).toBe(
      `Enter at least ${SEARCH_MIN_QUERY_LENGTH} characters to search.`,
    );
  });

  it("rejects overlong search queries", () => {
    const result = parseSearchQueryParam("a".repeat(81));

    expect(result.query).toBe("");
    expect(result.error).toContain("Search query is too long");
  });

  it("returns ilike patterns for valid queries", () => {
    expect(parseSearchQueryParam("   market   ")).toEqual({
      query: "market",
      error: null,
    });
    expect(toIlikePattern("market")).toBe("%market%");
  });
});
