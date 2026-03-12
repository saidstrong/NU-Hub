import { z } from "zod";

const NU_UTC_OFFSET_MINUTES = 5 * 60;
const DATETIME_LOCAL_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/;

function toNuLocalDateTimeUtcMs(value: string): number | null {
  const normalized = value.trim();
  const match = DATETIME_LOCAL_PATTERN.exec(normalized);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6] ?? "0");

  const localUtcMs = Date.UTC(year, month - 1, day, hour, minute, second);
  const localDateCheck = new Date(localUtcMs);

  if (
    localDateCheck.getUTCFullYear() !== year ||
    localDateCheck.getUTCMonth() !== month - 1 ||
    localDateCheck.getUTCDate() !== day ||
    localDateCheck.getUTCHours() !== hour ||
    localDateCheck.getUTCMinutes() !== minute ||
    localDateCheck.getUTCSeconds() !== second
  ) {
    return null;
  }

  return localUtcMs - NU_UTC_OFFSET_MINUTES * 60 * 1000;
}

export function nuLocalDateTimeToUtcIso(value: string): string | null {
  const utcMs = toNuLocalDateTimeUtcMs(value);
  if (utcMs === null) return null;

  return new Date(utcMs).toISOString();
}

const dateTimeLocalSchema = z
  .string()
  .trim()
  .refine((value) => toNuLocalDateTimeUtcMs(value) !== null, {
    message: "Enter a valid date and time.",
  });

export const toggleSavedEventSchema = z.object({
  eventId: z.string().uuid("Invalid event id."),
  redirectTo: z.string().optional(),
});

export const eventCreateSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, "Title is too short.")
      .max(120, "Title is too long."),
    description: z
      .string()
      .trim()
      .max(2000, "Description is too long.")
      .transform((value) => (value.length > 0 ? value : null)),
    category: z
      .string()
      .trim()
      .min(2, "Category is required.")
      .max(60, "Category is too long."),
    startsAtInput: dateTimeLocalSchema,
    endsAtInput: z
      .string()
      .trim()
      .transform((value) => (value.length > 0 ? value : null))
      .refine((value) => value === null || toNuLocalDateTimeUtcMs(value) !== null, {
        message: "Enter a valid end date and time.",
      }),
    location: z
      .string()
      .trim()
      .min(2, "Location is required.")
      .max(120, "Location is too long."),
    isPublishedInput: z
      .enum(["true", "false"])
      .transform((value) => value === "true"),
  })
  .superRefine((value, context) => {
    if (!value.endsAtInput) return;

    const startsAtMs = toNuLocalDateTimeUtcMs(value.startsAtInput);
    const endsAtMs = toNuLocalDateTimeUtcMs(value.endsAtInput);

    if (startsAtMs === null || endsAtMs === null) return;

    if (endsAtMs < startsAtMs) {
      context.addIssue({
        path: ["endsAtInput"],
        code: z.ZodIssueCode.custom,
        message: "End time must be after the start time.",
      });
    }
  });

export const eventParticipationSchema = z.object({
  eventId: z.string().uuid("Invalid event id."),
  status: z.enum(["interested", "joined"]),
  redirectTo: z.string().optional(),
});

export type EventCreateInput = z.infer<typeof eventCreateSchema>;
