import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getOnboardingRoute } from "@/lib/profile/onboarding";
import type { Database } from "@/types/database";

export function sanitizeNextPath(
  path: string | null | undefined,
  fallback = "/home",
): string {
  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return fallback;
  }

  return path;
}

export async function getPostAuthRedirectPath(
  supabase: SupabaseClient<Database>,
  user: User,
  requestedNext?: string | null,
): Promise<string> {
  const next = sanitizeNextPath(requestedNext, "/home");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("onboarding_step, onboarding_completed")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error("Failed to load account profile.");
  }

  if (!profile) {
    return "/onboarding/profile";
  }

  if (!profile.onboarding_completed) {
    return getOnboardingRoute(profile.onboarding_step);
  }

  return next;
}
