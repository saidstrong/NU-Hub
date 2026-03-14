import { ShellButton } from "@/components/ui/ShellButton";
import { SectionHeader } from "@/components/ui/SectionHeader";

export default function WelcomePage() {
  return (
    <main className="flex min-h-[82vh] flex-col items-center justify-center">
      <section className="wire-panel w-full max-w-md">
        <SectionHeader
          title="NU Atrium"
          subtitle="Campus marketplace, events, and communities in one focused platform."
        />
        <div className="mt-5 space-y-3">
          <ShellButton label="Create account" href="/signup" variant="primary" />
          <ShellButton label="Log in" href="/login" />
        </div>
      </section>
    </main>
  );
}
