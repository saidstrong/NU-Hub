import { z } from "zod";

export const moderationTargetTypes = ["listing", "event", "community", "community_post"] as const;
export const moderationReportReasons = [
  "spam",
  "scam",
  "harassment",
  "inappropriate",
  "misleading",
  "other",
] as const;

const optionalNoteSchema = z
  .string()
  .trim()
  .max(240, "Note must be 240 characters or fewer.")
  .transform((value) => (value.length > 0 ? value : null));

export const reportContentSchema = z.object({
  targetType: z.enum(moderationTargetTypes),
  targetId: z.string().uuid("Invalid report target."),
  reason: z.enum(moderationReportReasons),
  note: optionalNoteSchema,
  redirectTo: z.string().optional(),
});

export const setContentHiddenSchema = z.object({
  targetType: z.enum(moderationTargetTypes),
  targetId: z.string().uuid("Invalid moderation target."),
  isHiddenInput: z
    .enum(["true", "false"])
    .transform((value) => value === "true"),
  redirectTo: z.string().optional(),
});

export const resolveContentReportSchema = z.object({
  reportId: z.string().uuid("Invalid report id."),
  redirectTo: z.string().optional(),
});

export type ModerationTargetType = (typeof moderationTargetTypes)[number];
export type ModerationReportReason = (typeof moderationReportReasons)[number];
