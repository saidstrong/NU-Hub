"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { redirectWithError, redirectWithMessage } from "@/lib/actions/helpers";
import { getPostAuthRedirectPath, sanitizeNextPath } from "@/lib/auth/redirects";
import { createAppError } from "@/lib/observability/errors";
import { logAppError, logInfo, logSecurityEvent, logWarn } from "@/lib/observability/logger";
import { getRequestContext } from "@/lib/observability/request-context";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { getClientIp } from "@/lib/security/request";
import { createClient } from "@/lib/supabase/server";
import { loginSchema, signUpSchema } from "@/lib/validation/auth";

const LOGIN_IP_RATE_LIMIT = {
  maxHits: 80,
  windowMs: 10 * 60 * 1000,
};

const LOGIN_IDENTITY_RATE_LIMIT = {
  maxHits: 10,
  windowMs: 10 * 60 * 1000,
};

const SIGNUP_RATE_LIMIT = {
  maxHits: 12,
  windowMs: 60 * 60 * 1000,
};

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
  const requestContext = await getRequestContext({ action: "signUpAction" });
  const clientIp = await getClientIp();
  const signUpRateResult = consumeRateLimit(`auth:signup:ip:${clientIp}`, SIGNUP_RATE_LIMIT);

  if (!signUpRateResult.allowed) {
    logSecurityEvent("signup_rate_limited", {
      ...requestContext,
      retryAfterMs: signUpRateResult.retryAfterMs,
    });
    redirectWithError("/signup", "Too many sign-up attempts. Please try again later.");
  }

  const parsed = signUpSchema.safeParse({
    fullName: resolveSearchParam(formData.get("fullName")) ?? "",
    email: resolveSearchParam(formData.get("email")) ?? "",
    password: resolveSearchParam(formData.get("password")) ?? "",
    confirmPassword: resolveSearchParam(formData.get("confirmPassword")) ?? "",
  });

  if (!parsed.success) {
    logWarn("auth", "signup_validation_failed", {
      ...requestContext,
      issue: parsed.error.issues[0]?.message ?? "unknown_validation_error",
    });
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
    logAppError(
      "auth",
      "signup_failed",
      createAppError("AUTH_ERROR", error.message, {
        safeMessage: mapSignUpErrorMessage(error.message),
      }),
      requestContext,
    );
    redirectWithError("/signup", mapSignUpErrorMessage(error.message));
  }

  if (!data.user) {
    logAppError(
      "auth",
      "signup_missing_user",
      createAppError("AUTH_ERROR", "Supabase signUp response missing user.", {
        safeMessage: "Unable to create account. Please try again.",
      }),
      requestContext,
    );
    redirectWithError("/signup", "Unable to create account. Please try again.");
  }

  if (!data.session) {
    logInfo("auth", "signup_requires_email_confirmation", requestContext);
    redirectWithMessage(
      "/login",
      "Account created. Check your email to confirm your account.",
    );
  }

  logInfo("auth", "signup_completed", requestContext);
  redirect("/onboarding/profile");
}

export async function loginAction(formData: FormData) {
  const requestContext = await getRequestContext({ action: "loginAction" });
  const clientIp = await getClientIp();
  const rawEmail = (resolveSearchParam(formData.get("email")) ?? "").trim().toLowerCase();
  const rateLimitIdentity = rawEmail.slice(0, 120);
  const emailDomain = rawEmail.split("@")[1] ?? null;

  const loginIpRateResult = consumeRateLimit(`auth:login:ip:${clientIp}`, LOGIN_IP_RATE_LIMIT);
  const loginIdentityRateResult = consumeRateLimit(
    `auth:login:identity:${clientIp}:${rateLimitIdentity || "unknown"}`,
    LOGIN_IDENTITY_RATE_LIMIT,
  );

  if (!loginIpRateResult.allowed || !loginIdentityRateResult.allowed) {
    logSecurityEvent("login_rate_limited", {
      ...requestContext,
      emailDomain,
      retryAfterMs: Math.max(loginIpRateResult.retryAfterMs, loginIdentityRateResult.retryAfterMs),
    });
    const next = sanitizeNextPath(resolveSearchParam(formData.get("next")));
    const params = new URLSearchParams({
      error: "Too many login attempts. Please try again later.",
      ...(next !== "/home" ? { next } : {}),
    });
    redirect(`/login?${params.toString()}`);
  }

  const parsed = loginSchema.safeParse({
    email: rawEmail,
    password: resolveSearchParam(formData.get("password")) ?? "",
    next: resolveSearchParam(formData.get("next")),
  });

  if (!parsed.success) {
    logWarn("auth", "login_validation_failed", {
      ...requestContext,
      emailDomain,
      issue: parsed.error.issues[0]?.message ?? "unknown_validation_error",
    });
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
    logSecurityEvent("login_invalid_credentials", {
      ...requestContext,
      emailDomain,
    });
    const params = new URLSearchParams({
      error: "Invalid email or password.",
      ...(next !== "/home" ? { next } : {}),
    });
    redirect(`/login?${params.toString()}`);
  }

  if (!data.user) {
    logAppError(
      "auth",
      "login_missing_user",
      createAppError("AUTH_ERROR", "Supabase signInWithPassword response missing user.", {
        safeMessage: "Unable to load account after login.",
      }),
      requestContext,
    );
    redirectWithError("/login", "Unable to load account after login.");
  }

  let redirectPath: string;
  try {
    redirectPath = await getPostAuthRedirectPath(supabase, data.user, parsed.data.next);
  } catch (error) {
    logAppError(
      "auth",
      "post_auth_redirect_resolution_failed",
      createAppError("DATABASE_ERROR", "Failed to resolve post-auth redirect path.", {
        safeMessage: "Failed to load account profile.",
        cause: error,
      }),
      requestContext,
    );
    redirectWithError("/login", "Failed to load account profile.");
  }

  logInfo("auth", "login_succeeded", {
    ...requestContext,
    emailDomain,
    redirectPath,
  });
  redirect(redirectPath);
}

export async function logoutAction() {
  const requestContext = await getRequestContext({ action: "logoutAction" });
  const supabase = await createClient();
  await supabase.auth.signOut();
  logInfo("auth", "logout_succeeded", requestContext);
  redirect("/welcome");
}
