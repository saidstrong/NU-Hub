import { z } from "zod";

export const SEARCH_MIN_QUERY_LENGTH = 2;
export const SEARCH_MAX_QUERY_LENGTH = 80;
export const SEARCH_SECTION_LIMIT = 5;

const searchInputSchema = z
  .string()
  .trim()
  .max(SEARCH_MAX_QUERY_LENGTH, `Search query is too long (max ${SEARCH_MAX_QUERY_LENGTH} chars).`);

export function sanitizeSearchQuery(value: string): string {
  return value
    .replace(/[%_,()"'\\;]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseSearchQueryParam(value?: string): {
  query: string;
  error: string | null;
} {
  const raw = value ?? "";
  if (!raw.trim()) {
    return { query: "", error: null };
  }

  const parsed = searchInputSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      query: "",
      error: parsed.error.issues[0]?.message ?? "Invalid search query.",
    };
  }

  const query = sanitizeSearchQuery(parsed.data);
  if (query.length < SEARCH_MIN_QUERY_LENGTH) {
    return {
      query: "",
      error: `Enter at least ${SEARCH_MIN_QUERY_LENGTH} characters to search.`,
    };
  }

  return { query, error: null };
}

export function toIlikePattern(query: string): string {
  return `%${query}%`;
}
