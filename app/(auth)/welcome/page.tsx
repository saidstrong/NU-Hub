import { ShellButton } from "@/components/ui/ShellButton";
import { SectionHeader } from "@/components/ui/SectionHeader";

export default function WelcomePage() {
  return (
    <main className="flex min-h-[82vh] flex-col items-center justify-center">
      <section className="wire-panel w-full max-w-md">
        <SectionHeader
          title="NU Atrium"
          subtitle="The trusted campus network where NU students join activity, coordinate with communities, and exchange with each other."
        />
        <div className="mt-5 space-y-2 text-[13px] leading-relaxed text-wire-300">
          <p>Discover campus events, groups, and opportunities that matter.</p>
          <p>Coordinate with classmates, organizers, and communities in one place.</p>
          <p>Handle student-to-student exchange inside the NU network.</p>
        </div>
        <div className="mt-5 space-y-3">
          <ShellButton label="Create account" href="/signup" variant="primary" />
          <ShellButton label="Log in" href="/login" />
        </div>
      </section>
    </main>
  );
}
