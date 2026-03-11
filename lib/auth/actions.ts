"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { redirectWithError, redirectWithMessage } from "@/lib/actions/helpers";
import { getPostAuthRedirectPath, sanitizeNextPath } from "@/lib/auth/redirects";
import { createClient } from "@/lib/supabase/server";
import { loginSchema, signUpSchema } from "@/lib/validation/auth";

function resolveSearchParam(
  value: FormDataEntryValue | null,
): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function mapSignUpErrorMessage(errorMessage: string): string {
  const normalized = errorMessage.toLowerCase();

  if (normalized.includes("already") && normalized.includes("registered")) {
    return "An account with this email already exists.";
  }

  if (normalized.includes("password")) {
    return "Password does not meet security requirements.";
  }

  if (normalized.includes("email")) {
    return "Please use a valid NU email address.";
  }

  return "Unable to create account. Please try again.";
}

async function getEmailRedirectTo(path: string): Promise<string | undefined> {
  const configuredBaseUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configuredBaseUrl) {
    try {
      return new URL(path, configuredBaseUrl).toString();
    } catch {
      // Fall back to request-derived origin if config is invalid.
    }
  }

  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  if (!host) return undefined;

  const forwardedProto = headerStore.get("x-forwarded-proto");
  const protocol =
    forwardedProto === "https" || forwardedProto === "http"
      ? forwardedProto
      : process.env.NODE_ENV === "production"
        ? "https"
        : "http";

  return `${protocol}://${host}${path}`;
}

export async function signUpAction(formData: FormData) {
  const parsed = signUpSchema.safeParse({
    fullName: resolveSearchParam(formData.get("fullName")) ?? "",
    email: resolveSearchParam(formData.get("email")) ?? "",
    password: resolveSearchParam(formData.get("password")) ?? "",
    confirmPassword: resolveSearchParam(formData.get("confirmPassword")) ?? "",
  });

  if (!parsed.success) {
    redirectWithError("/signup", parsed.error.issues[0]?.message ?? "Invalid sign-up input.");
  }

  const supabase = await createClient();
  const { fullName, email, password } = parsed.data;
  const emailRedirectTo = await getEmailRedirectTo("/auth/confirm");

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
      ...(emailRedirectTo ? { emailRedirectTo } : {}),
    },
  });

  if (error) {
    redirectWithError("/signup", mapSignUpErrorMessage(error.message));
  }

  if (!data.user) {
    redirectWithError("/signup", "Unable to create account. Please try again.");
  }

  if (!data.session) {
    redirectWithMessage(
      "/login",
      "Account created. Check your email to confirm your account.",
    );
  }

  redirect("/onboarding/profile");
}

export async function loginAction(formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: resolveSearchParam(formData.get("email")) ?? "",
    password: resolveSearchParam(formData.get("password")) ?? "",
    next: resolveSearchParam(formData.get("next")),
  });

  if (!parsed.success) {
    const next = sanitizeNextPath(resolveSearchParam(formData.get("next")));
    const params = new URLSearchParams({
      error: parsed.error.issues[0]?.message ?? "Invalid login input.",
      ...(next !== "/home" ? { next } : {}),
    });
    redirect(`/login?${params.toString()}`);
  }

  const supabase = await createClient();
  const { email, password } = parsed.data;
  const next = sanitizeNextPath(parsed.data.next);

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    const params = new URLSearchParams({
      error: "Invalid email or password.",
      ...(next !== "/home" ? { next } : {}),
    });
    redirect(`/login?${params.toString()}`);
  }

  if (!data.user) {
    redirectWithError("/login", "Unable to load account after login.");
  }

  let redirectPath: string;
  try {
    redirectPath = await getPostAuthRedirectPath(supabase, data.user, parsed.data.next);
  } catch {
    redirectWithError("/login", "Failed to load account profile.");
  }

  redirect(redirectPath);
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/welcome");
}
