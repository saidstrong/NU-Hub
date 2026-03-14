import Link from "next/link";
import { FeedbackBanner } from "@/components/ui/FeedbackBanner";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { signUpAction } from "@/lib/auth/actions";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { WireField } from "@/components/ui/WireField";

type SignUpPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const { error } = await searchParams;

  return (
    <main className="flex min-h-[82vh] flex-col justify-center">
      <section className="wire-panel mx-auto w-full max-w-md">
        <SectionHeader
          title="Create account"
          subtitle="Use your NU email to join the campus platform."
          actionNode={
            <Link href="/welcome" className="wire-link">
              Welcome
            </Link>
          }
        />
        {error ? <FeedbackBanner tone="error" message={error} className="mb-3" /> : null}
        <form action={signUpAction} className="space-y-3">
          <WireField label="Full name" name="fullName" required autoComplete="name" />
          <WireField
            label="NU email"
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
            autoComplete="new-password"
          />
          <WireField
            label="Confirm password"
            name="confirmPassword"
            type="password"
            required
            autoComplete="new-password"
          />
          <div className="pt-1">
            <SubmitButton label="Create account" pendingLabel="Creating account..." variant="primary" />
          </div>
        </form>
        <p className="mt-5 text-center text-[13px] text-wire-300">
          Already have an account?{" "}
          <Link href="/login" className="wire-link inline-flex min-h-0">
            Log in
          </Link>
        </p>
      </section>
    </main>
  );
}
