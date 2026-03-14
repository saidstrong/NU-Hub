import Link from "next/link";
import { ShellButton } from "@/components/ui/ShellButton";
import { SectionHeader } from "@/components/ui/SectionHeader";

export default function WelcomePage() {
  return (
    <main className="flex min-h-[82vh] flex-col items-center justify-center">
      <section className="wire-panel w-full max-w-md">
        <SectionHeader
          title="NU Atrium"
          subtitle="A focused campus platform for marketplace, events, communities, and student coordination."
        />
        <p className="text-[14px] leading-relaxed text-wire-200">
          Start with your NU account to access your profile, conversations, and campus activity in one place.
        </p>
        <div className="mt-5 space-y-3">
          <ShellButton label="Create account" href="/signup" variant="primary" />
          <ShellButton label="Log in" href="/login" />
        </div>
        <div className="mt-5 text-center">
          <Link href="/login" className="wire-link inline-flex min-h-0">
            Continue with existing account
          </Link>
        </div>
      </section>
    </main>
  );
}
