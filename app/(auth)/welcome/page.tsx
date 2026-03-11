import Link from "next/link";
import { ShellButton } from "@/components/ui/ShellButton";

export default function WelcomePage() {
  return (
    <main className="flex min-h-[80vh] flex-col items-center justify-center">
      <div className="wire-panel w-full p-6 text-center">
        <p className="wire-label">Campus Utility</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">NU Hub</h1>
        <p className="mt-3 text-sm text-wire-300">
          A structural prototype for market, events, and student community discovery.
        </p>
        <div className="mt-6 space-y-3">
          <ShellButton label="Sign Up" href="/signup" />
          <ShellButton label="Log In" href="/login" />
        </div>
        <div className="mt-6">
          <Link href="/login" className="text-xs text-wire-300 underline-offset-2 hover:underline">
            Continue to sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
