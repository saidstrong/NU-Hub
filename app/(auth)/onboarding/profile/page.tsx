import { updateOnboardingProfileAction } from "@/lib/profile/actions";
import { getCurrentProfile } from "@/lib/profile/data";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { TopBar } from "@/components/ui/TopBar";
import { WireField, WireTextarea } from "@/components/ui/WireField";

type OnboardingProfilePageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function OnboardingProfilePage({
  searchParams,
}: OnboardingProfilePageProps) {
  const [{ error }, profile] = await Promise.all([searchParams, getCurrentProfile()]);

  return (
    <main>
      <TopBar title="Onboarding" subtitle="Profile basics" backHref="/signup" />
      <form action={updateOnboardingProfileAction} className="wire-panel space-y-4">
        {error ? (
          <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-[13px] text-red-200">
            {error}
          </div>
        ) : null}
        <div className="mx-auto h-16 w-16 rounded-full border border-dashed border-wire-600 bg-wire-800/20" />
        <WireField
          label="Name"
          name="fullName"
          required
          autoComplete="name"
          defaultValue={profile.full_name}
        />
        <WireField label="School" name="school" defaultValue={profile.school} />
        <WireField label="Major" name="major" defaultValue={profile.major} />
        <WireField label="Year" name="yearLabel" defaultValue={profile.year_label} />
        <WireTextarea label="Short bio" name="bio" defaultValue={profile.bio} rows={4} />
        <SubmitButton label="Continue" pendingLabel="Saving..." variant="primary" />
      </form>
    </main>
  );
}
