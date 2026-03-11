import type { EmailOtpType } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getPostAuthRedirectPath } from "@/lib/auth/redirects";
import { createClient } from "@/lib/supabase/server";

function redirectToLoginWithError(request: NextRequest, message: string) {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("error", message);
  return NextResponse.redirect(loginUrl);
}

async function redirectAfterAuth(
  supabase: Awaited<ReturnType<typeof createClient>>,
  request: NextRequest,
  requestedNext: string | null,
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirectToLoginWithError(request, "Unable to load account after confirmation.");
  }

  try {
    const redirectPath = await getPostAuthRedirectPath(supabase, user, requestedNext);
    return NextResponse.redirect(new URL(redirectPath, request.url));
  } catch {
    return redirectToLoginWithError(request, "Failed to load account profile.");
  }
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");
  const next = requestUrl.searchParams.get("next");
  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return redirectAfterAuth(supabase, request, next);
    }
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as EmailOtpType,
      token_hash: tokenHash,
    });

    if (!error) {
      return redirectAfterAuth(supabase, request, next);
    }
  }

  return redirectToLoginWithError(request, "Invalid or expired confirmation link.");
}
