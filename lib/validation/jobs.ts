import { z } from "zod";
import { nuLocalDateTimeToUtcIso } from "@/lib/validation/events";

export const JOB_TYPE_VALUES = ["internship", "part_time", "volunteer", "research"] as const;
export const JOB_LOCATION_MODE_VALUES = [
  "on_campus",
  "remote",
  "hybrid",
  "off_campus",
] as const;
export const JOB_APPLY_METHOD_VALUES = ["link", "email", "telegram"] as const;
export const JOB_STATUS_VALUES = ["pending_review", "published", "rejected"] as const;

const optionalTextField = z
  .string()
  .trim()
  .max(2000, "Value is too long.")
  .transform((value) => (value.length > 0 ? value : null));

const optionalShortTextField = z
  .string()
  .trim()
  .max(160, "Value is too long.")
  .transform((value) => (value.length > 0 ? value : null));

const optionalUrlField = z
  .string()
  .trim()
  .max(500, "URL is too long.")
  .transform((value) => (value.length > 0 ? value : null));

const optionalEmailField = z
  .string()
  .trim()
  .max(320, "Email is too long.")
  .transform((value) => (value.length > 0 ? value : null));

const optionalTelegramField = z
  .string()
  .trim()
  .max(120, "Telegram contact is too long.")
  .transform((value) => (value.length > 0 ? value : null));

const baseJobSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Title is too short.")
    .max(120, "Title is too long."),
  organizationName: z
    .string()
    .trim()
    .min(2, "Organization is required.")
    .max(120, "Organization is too long."),
  jobType: z.enum(JOB_TYPE_VALUES),
  locationMode: z.enum(JOB_LOCATION_MODE_VALUES),
  locationText: optionalShortTextField,
  description: z
    .string()
    .trim()
    .min(20, "Description is too short.")
    .max(4000, "Description is too long."),
  requirements: optionalTextField,
  compensationText: optionalShortTextField,
  applyMethod: z.enum(JOB_APPLY_METHOD_VALUES),
  applyUrl: optionalUrlField,
  applyEmail: optionalEmailField,
  applyTelegram: optionalTelegramField,
  expiresAtInput: z
    .string()
    .trim()
    .refine((value) => nuLocalDateTimeToUtcIso(value) !== null, {
      message: "Enter a valid expiration date and time.",
    }),
});

function isValidUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

const jobCreateOrUpdateSchema = baseJobSchema.superRefine((value, context) => {
  const expiresAtIso = nuLocalDateTimeToUtcIso(value.expiresAtInput);
  if (!expiresAtIso) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["expiresAtInput"],
      message: "Enter a valid expiration date and time.",
    });
  } else if (new Date(expiresAtIso).getTime() <= Date.now()) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["expiresAtInput"],
      message: "Expiration must be in the future.",
    });
  }

  if (value.applyMethod === "link") {
    if (!value.applyUrl) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["applyUrl"],
        message: "Application link is required.",
      });
    } else if (!isValidUrl(value.applyUrl)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["applyUrl"],
        message: "Enter a valid application URL.",
      });
    }
    return;
  }

  if (value.applyMethod === "email") {
    if (!value.applyEmail) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["applyEmail"],
        message: "Application email is required.",
      });
    } else if (!z.string().email().safeParse(value.applyEmail).success) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["applyEmail"],
        message: "Enter a valid application email.",
      });
    }
    return;
  }

  if (!value.applyTelegram) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["applyTelegram"],
      message: "Telegram contact is required.",
    });
  }
});

export const createJobSchema = jobCreateOrUpdateSchema;
export const updateJobSchema = jobCreateOrUpdateSchema;

export const jobMutationIdSchema = z.object({
  jobId: z.string().uuid("Invalid job id."),
});

export const moderateJobSchema = z.object({
  jobId: z.string().uuid("Invalid job id."),
  redirectTo: z.string().optional(),
});

export const setJobHiddenSchema = moderateJobSchema.extend({
  isHiddenInput: z.enum(["true", "false"]),
});

export type JobCreateInput = z.infer<typeof createJobSchema>;
export type JobUpdateInput = z.infer<typeof updateJobSchema>;
