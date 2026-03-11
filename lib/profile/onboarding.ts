import type { Database } from "@/types/database";

type OnboardingStep = Database["public"]["Tables"]["profiles"]["Row"]["onboarding_step"];

export function getOnboardingRoute(step: OnboardingStep): string {
  switch (step) {
    case "profile":
      return "/onboarding/profile";
    case "interests":
      return "/onboarding/interests";
    case "looking_for":
      return "/onboarding/looking-for";
    case "professional":
      return "/onboarding/professional";
    case "completed":
      return "/home";
    default:
      return "/onboarding/profile";
  }
}
