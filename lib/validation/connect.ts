import { z } from "zod";

function parseTags(raw: string): string[] {
  if (!raw) return [];

  return Array.from(
    new Set(
      raw
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ).slice(0, 10);
}

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Must be ${max} characters or fewer.`)
    .transform((value) => (value.length > 0 ? value : null));

export const createCommunitySchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Community name is too short.")
    .max(80, "Community name is too long."),
  description: z
    .string()
    .trim()
    .min(12, "Description is too short.")
    .max(1200, "Description is too long."),
  category: optionalText(60),
  tagsInput: z
    .string()
    .trim()
    .max(320, "Tags input is too long.")
    .transform((value) => parseTags(value))
    .pipe(
      z.array(
        z
          .string()
          .trim()
          .min(1)
          .max(24, "Each tag must be 24 characters or fewer."),
      ).max(10, "Use up to 10 tags."),
    ),
  joinType: z.enum(["open", "request"]),
});

export const communityJoinSchema = z.object({
  communityId: z.string().uuid("Invalid community id."),
  redirectTo: z.string().optional(),
});

export const communityRequestReviewSchema = z.object({
  communityId: z.string().uuid("Invalid community id."),
  userId: z.string().uuid("Invalid user id."),
  decision: z.enum(["approve", "reject"]),
  redirectTo: z.string().optional(),
});
