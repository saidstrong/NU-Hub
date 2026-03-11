import Link from "next/link";
import { TopBar } from "@/components/ui/TopBar";
import { logoutAction } from "@/lib/auth/actions";

export default function SettingsPage() {
  return (
    <main>
      <TopBar
        title="Settings"
        subtitle="Manage profile, notifications, and account preferences"
        backHref="/profile"
      />

      <section className="wire-panel">
        <div className="mb-4 border-b border-wire-700 pb-3">
          <h2 className="wire-section-title">Profile and preferences</h2>
          <p className="mt-1 wire-meta">Practical controls for your NU Hub experience.</p>
        </div>
        <div className="space-y-2">
          <Link
            href="/profile/edit"
            className="block rounded-xl border border-wire-700 bg-wire-800 px-3 py-3 transition-colors duration-150 hover:border-wire-600 hover:bg-wire-900"
          >
            <p className="text-sm font-medium text-wire-100">Edit profile</p>
            <p className="mt-1 wire-meta">Update your campus identity and profile details.</p>
          </Link>
          <Link
            href="/profile/notifications"
            className="block rounded-xl border border-wire-700 bg-wire-800 px-3 py-3 transition-colors duration-150 hover:border-wire-600 hover:bg-wire-900"
          >
            <p className="text-sm font-medium text-wire-100">Notifications</p>
            <p className="mt-1 wire-meta">Review listing, event, and community updates.</p>
          </Link>
          <Link
            href="/profile/settings"
            className="block rounded-xl border border-wire-700 bg-wire-800 px-3 py-3 transition-colors duration-150 hover:border-wire-600 hover:bg-wire-900"
          >
            <p className="text-sm font-medium text-wire-100">Privacy</p>
            <p className="mt-1 wire-meta">Control profile visibility and sharing preferences.</p>
          </Link>
          <Link
            href="/profile/settings"
            className="block rounded-xl border border-wire-700 bg-wire-800 px-3 py-3 transition-colors duration-150 hover:border-wire-600 hover:bg-wire-900"
          >
            <p className="text-sm font-medium text-wire-100">Help</p>
            <p className="mt-1 wire-meta">Get guidance for account and product basics.</p>
          </Link>
        </div>
      </section>

      <section className="wire-panel">
        <div className="mb-3">
          <h2 className="wire-section-title">Account</h2>
          <p className="mt-1 wire-meta">Session and access controls.</p>
        </div>
        <form action={logoutAction}>
          <button type="submit" className="wire-action w-full border-dashed">
            Logout
          </button>
        </form>
      </section>
    </main>
  );
}
