"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import type { Database } from "@/types/database";
import {
  editProfileSchema,
  onboardingInterestsSchema,
  onboardingLookingForSchema,
  onboardingProfessionalSchema,
  onboardingProfileSchema,
  parseCommaList,
  parseProjects,
} from "@/lib/validation/profile";

function getStringValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function getStringArray(formData: FormData, key: string): string[] {
  return formData
    .getAll(key)
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);
}

function redirectWithError(path: string, message: string): never {
  const params = new URLSearchParams({ error: message });
  redirect(`${path}?${params.toString()}`);
}

async function updateProfile(
  userId: string,
  payload: Database["public"]["Tables"]["profiles"]["Update"],
  onErrorPath: string,
) {
  const supabase = await createClient();
  const profilesTable = supabase.from("profiles");
  const { error } = await profilesTable
    .update(payload)
    .eq("user_id", userId);

  if (error) {
    redirectWithError(onErrorPath, error.message);
  }
}

function toLinksObject(values: {
  githubUrl: string | null;
  linkedinUrl: string | null;
  portfolioUrl: string | null;
}) {
  return {
    ...(values.githubUrl ? { github: values.githubUrl } : {}),
    ...(values.linkedinUrl ? { linkedin: values.linkedinUrl } : {}),
    ...(values.portfolioUrl ? { portfolio: values.portfolioUrl } : {}),
  };
}

export async function updateOnboardingProfileAction(formData: FormData) {
  const parsed = onboardingProfileSchema.safeParse({
    fullName: getStringValue(formData, "fullName"),
    school: getStringValue(formData, "school"),
    major: getStringValue(formData, "major"),
    yearLabel: getStringValue(formData, "yearLabel"),
    bio: getStringValue(formData, "bio"),
  });

  if (!parsed.success) {
    redirectWithError(
      "/onboarding/profile",
      parsed.error.issues[0]?.message ?? "Invalid profile input.",
    );
  }

  const user = await requireUser();

  await updateProfile(
    user.id,
    {
      full_name: parsed.data.fullName,
      school: parsed.data.school,
      major: parsed.data.major,
      year_label: parsed.data.yearLabel,
      bio: parsed.data.bio,
      onboarding_step: "interests",
      onboarding_completed: false,
    },
    "/onboarding/profile",
  );

  revalidatePath("/profile");
  revalidatePath("/profile/edit");
  redirect("/onboarding/interests");
}

export async function updateOnboardingInterestsAction(formData: FormData) {
  const parsed = onboardingInterestsSchema.safeParse({
    interests: getStringArray(formData, "interests"),
  });

  if (!parsed.success) {
    redirectWithError(
      "/onboarding/interests",
      parsed.error.issues[0]?.message ?? "Select at least one interest.",
    );
  }

  const user = await requireUser();

  await updateProfile(
    user.id,
    {
      interests: parsed.data.interests,
      onboarding_step: "looking_for",
      onboarding_completed: false,
    },
    "/onboarding/interests",
  );

  revalidatePath("/profile");
  redirect("/onboarding/looking-for");
}

export async function updateOnboardingLookingForAction(formData: FormData) {
  const parsed = onboardingLookingForSchema.safeParse({
    lookingFor: getStringArray(formData, "lookingFor"),
  });

  if (!parsed.success) {
    redirectWithError(
      "/onboarding/looking-for",
      parsed.error.issues[0]?.message ?? "Select at least one option.",
    );
  }

  const user = await requireUser();

  await updateProfile(
    user.id,
    {
      looking_for: parsed.data.lookingFor,
      onboarding_step: "professional",
      onboarding_completed: false,
    },
    "/onboarding/looking-for",
  );

  revalidatePath("/profile");
  redirect("/onboarding/professional");
}

export async function completeOnboardingAction(formData: FormData) {
  const parsed = onboardingProfessionalSchema.safeParse({
    skillsInput: getStringValue(formData, "skillsInput"),
    projectsInput: getStringValue(formData, "projectsInput"),
    resumeUrl: getStringValue(formData, "resumeUrl"),
    githubUrl: getStringValue(formData, "githubUrl"),
    linkedinUrl: getStringValue(formData, "linkedinUrl"),
    portfolioUrl: getStringValue(formData, "portfolioUrl"),
  });

  if (!parsed.success) {
    redirectWithError(
      "/onboarding/professional",
      parsed.error.issues[0]?.message ?? "Invalid professional profile input.",
    );
  }

  const user = await requireUser();
  const skills = parseCommaList(parsed.data.skillsInput, 12);
  const projects = parseProjects(parsed.data.projectsInput);

  await updateProfile(
    user.id,
    {
      skills,
      projects,
      resume_url: parsed.data.resumeUrl,
      links: toLinksObject(parsed.data),
      onboarding_step: "completed",
      onboarding_completed: true,
    },
    "/onboarding/professional",
  );

  revalidatePath("/profile");
  revalidatePath("/profile/edit");
  redirect("/home");
}

export async function skipOnboardingProfessionalAction() {
  const user = await requireUser();

  await updateProfile(
    user.id,
    {
      onboarding_step: "completed",
      onboarding_completed: true,
    },
    "/onboarding/professional",
  );

  revalidatePath("/profile");
  redirect("/home");
}

export async function updateProfileAction(formData: FormData) {
  const parsed = editProfileSchema.safeParse({
    fullName: getStringValue(formData, "fullName"),
    school: getStringValue(formData, "school"),
    major: getStringValue(formData, "major"),
    yearLabel: getStringValue(formData, "yearLabel"),
    bio: getStringValue(formData, "bio"),
    interestsInput: getStringValue(formData, "interestsInput"),
    goalsInput: getStringValue(formData, "goalsInput"),
    lookingForInput: getStringValue(formData, "lookingForInput"),
    skillsInput: getStringValue(formData, "skillsInput"),
    projectsInput: getStringValue(formData, "projectsInput"),
    resumeUrl: getStringValue(formData, "resumeUrl"),
    githubUrl: getStringValue(formData, "githubUrl"),
    linkedinUrl: getStringValue(formData, "linkedinUrl"),
    portfolioUrl: getStringValue(formData, "portfolioUrl"),
  });

  if (!parsed.success) {
    redirectWithError(
      "/profile/edit",
      parsed.error.issues[0]?.message ?? "Invalid profile update input.",
    );
  }

  const user = await requireUser();

  await updateProfile(
    user.id,
    {
      full_name: parsed.data.fullName,
      school: parsed.data.school,
      major: parsed.data.major,
      year_label: parsed.data.yearLabel,
      bio: parsed.data.bio,
      interests: parseCommaList(parsed.data.interestsInput, 20),
      goals: parseCommaList(parsed.data.goalsInput, 20),
      looking_for: parseCommaList(parsed.data.lookingForInput, 20),
      skills: parseCommaList(parsed.data.skillsInput, 20),
      projects: parseProjects(parsed.data.projectsInput),
      resume_url: parsed.data.resumeUrl,
      links: toLinksObject(parsed.data),
      onboarding_step: "completed",
      onboarding_completed: true,
    },
    "/profile/edit",
  );

  revalidatePath("/profile");
  revalidatePath("/profile/edit");
  redirect("/profile?message=Profile%20updated");
}
