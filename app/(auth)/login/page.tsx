import Link from "next/link";
import { FeedbackBanner } from "@/components/ui/FeedbackBanner";
import { SectionHeader } from "@/components/ui/SectionHeader";
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
    <main className="flex min-h-[82vh] flex-col justify-center">
      <section className="wire-panel mx-auto w-full max-w-md">
        <SectionHeader
          title="Log in"
          subtitle="Sign in with your NU account to access communities, events, and student exchange."
          actionNode={
            <Link href="/welcome" className="wire-link">
              Welcome
            </Link>
          }
        />
        {message ? <FeedbackBanner tone="success" message={message} className="mb-3" /> : null}
        {error ? <FeedbackBanner tone="error" message={error} className="mb-3" /> : null}
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
          <div className="pt-1">
            <SubmitButton label="Log in" pendingLabel="Signing in..." variant="primary" />
          </div>
        </form>
        <p className="mt-5 text-center text-[13px] text-wire-300">
          Need an account?{" "}
          <Link href="/signup" className="wire-link inline-flex min-h-0">
            Create one
          </Link>
        </p>
      </section>
    </main>
  );
}
