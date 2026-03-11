import Link from "next/link";
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
    <main>
      <div className="wire-panel mx-auto max-w-sm">
        <h1 className="wire-title mb-4">Create Account</h1>
        <p className="mb-4 wire-subtitle">Use your NU email to create an account.</p>
        {error ? (
          <div className="mb-3 rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-[13px] text-red-200">
            {error}
          </div>
        ) : null}
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
          <SubmitButton label="Create account" pendingLabel="Creating account..." variant="primary" />
        </form>
        <p className="mt-4 text-center text-[13px] text-wire-300">
          Already have an account?{" "}
          <Link href="/login" className="wire-link inline-flex min-h-0">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
