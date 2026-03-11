import { z } from "zod";
import type { Json } from "@/types/database";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Must be ${max} characters or fewer.`)
    .transform((value) => (value.length > 0 ? value : null));

const optionalUrl = z
  .string()
  .trim()
  .max(300, "URL is too long.")
  .refine((value) => value.length === 0 || /^https?:\/\//i.test(value), {
    message: "Use a valid URL starting with http:// or https://.",
  })
  .transform((value) => (value.length > 0 ? value : null));

const chipsArray = z.array(
  z
    .string()
    .trim()
    .min(1)
    .max(40, "Each value must be 40 characters or fewer."),
);

export const onboardingProfileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Name is too short.")
    .max(80, "Name is too long."),
  school: optionalText(80),
  major: optionalText(80),
  yearLabel: optionalText(40),
  bio: optionalText(320),
});

export const onboardingInterestsSchema = z.object({
  interests: chipsArray
    .min(1, "Select at least one interest.")
    .max(12)
    .transform((items) => Array.from(new Set(items))),
});

export const onboardingLookingForSchema = z.object({
  lookingFor: chipsArray
    .min(1, "Select at least one option.")
    .max(12)
    .transform((items) => Array.from(new Set(items))),
});

export const onboardingProfessionalSchema = z.object({
  skillsInput: z.string().trim().max(500, "Skills input is too long."),
  projectsInput: z.string().trim().max(2000, "Projects input is too long."),
  resumeUrl: optionalUrl,
  githubUrl: optionalUrl,
  linkedinUrl: optionalUrl,
  portfolioUrl: optionalUrl,
});

export const editProfileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Name is too short.")
    .max(80, "Name is too long."),
  school: optionalText(80),
  major: optionalText(80),
  yearLabel: optionalText(40),
  bio: optionalText(320),
  interestsInput: z.string().trim().max(600, "Interests input is too long."),
  goalsInput: z.string().trim().max(600, "Goals input is too long."),
  lookingForInput: z.string().trim().max(600, "Looking-for input is too long."),
  skillsInput: z.string().trim().max(600, "Skills input is too long."),
  projectsInput: z.string().trim().max(2000, "Projects input is too long."),
  resumeUrl: optionalUrl,
  githubUrl: optionalUrl,
  linkedinUrl: optionalUrl,
  portfolioUrl: optionalUrl,
});

export function parseCommaList(raw: string, maxItems = 12): string[] {
  if (!raw) return [];
  return Array.from(
    new Set(
      raw
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ).slice(0, maxItems);
}

export function parseProjects(raw: string): Json {
  if (!raw) return [];

  const projects = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 8)
    .map((line) => {
      const separatorIndex = line.indexOf(" - ");
      if (separatorIndex === -1) {
        return { title: line };
      }

      const title = line.slice(0, separatorIndex).trim();
      const summary = line.slice(separatorIndex + 3).trim();
      return summary ? { title, summary } : { title };
    });

  return projects;
}
