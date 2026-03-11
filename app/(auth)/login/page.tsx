import Link from "next/link";
import { loginAction } from "@/lib/auth/actions";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { WireField } from "@/components/ui/WireField";

type LoginPageProps = {
  searchParams: Promise<{
    next?: string;
    error?: string;
    message?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next, error, message } = await searchParams;

  return (
    <main>
      <div className="wire-panel mx-auto max-w-sm">
        <h1 className="wire-title mb-4">Log In</h1>
        <p className="mb-4 wire-subtitle">Sign in with your NU account.</p>
        {message ? (
          <div className="mb-3 rounded-xl border border-accent/35 bg-accent/10 px-3 py-2 text-[13px] text-wire-100">
            {message}
          </div>
        ) : null}
        {error ? (
          <div className="mb-3 rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-[13px] text-red-200">
            {error}
          </div>
        ) : null}
        <form action={loginAction} className="space-y-3">
          <input type="hidden" name="next" value={next ?? ""} />
          <WireField
            label="Email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@nu.edu.kz"
          />
          <WireField
            label="Password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
          />
          <SubmitButton label="Log in" pendingLabel="Signing in..." variant="primary" />
        </form>
        <p className="mt-4 text-center text-[13px] text-wire-300">
          Need an account?{" "}
          <Link href="/signup" className="wire-link inline-flex min-h-0">
            Create one
          </Link>
        </p>
      </div>
    </main>
  );
}
