import Link from "next/link";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { TopBar } from "@/components/ui/TopBar";
import { logoutAction } from "@/lib/auth/actions";

export default function SettingsPage() {
  return (
    <main>
      <TopBar
        title="Profile settings"
        subtitle="Profile controls and account actions."
        backHref="/profile"
      />

      <section className="wire-panel">
        <SectionHeader
          title="Profile controls"
          subtitle="Update your profile details or review the updates linked to your account."
        />
        <div className="space-y-2">
          <Link
            href="/profile/edit"
            className="block rounded-xl border border-wire-700 bg-wire-800 px-3 py-3 transition-colors duration-150 hover:border-wire-600 hover:bg-wire-900"
          >
            <p className="text-sm font-medium text-wire-100">Edit profile</p>
            <p className="mt-1 wire-meta">Maintain your campus identity, trust cues, and public details.</p>
          </Link>
          <Link
            href="/profile/notifications"
            className="block rounded-xl border border-wire-700 bg-wire-800 px-3 py-3 transition-colors duration-150 hover:border-wire-600 hover:bg-wire-900"
          >
            <p className="text-sm font-medium text-wire-100">Notifications</p>
            <p className="mt-1 wire-meta">Review market, event, and community updates linked to your activity.</p>
          </Link>
        </div>
      </section>

      <section className="wire-panel">
        <SectionHeader
          title="Account access"
          subtitle="Use account actions only when you need to end access on this device."
        />
        <form action={logoutAction}>
          <button type="submit" className="wire-action w-full border-dashed">
            Log out
          </button>
        </form>
      </section>
    </main>
  );
}
