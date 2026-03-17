import { updateOnboardingProfileAction } from "@/lib/profile/actions";
import {
  MAJOR_OPTIONS,
  SCHOOL_OPTIONS,
  YEAR_LABEL_OPTIONS,
  toSelectOptions,
  withLegacyValue,
} from "@/lib/profile/academic-options";
import { getSuggestedProfileName } from "@/lib/profile/name-suggestion";
import { getCurrentProfile } from "@/lib/profile/data";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { TopBar } from "@/components/ui/TopBar";
import { WireField, WireSelect, WireTextarea } from "@/components/ui/WireField";

type OnboardingProfilePageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function OnboardingProfilePage({
  searchParams,
}: OnboardingProfilePageProps) {
  const [{ error }, profile] = await Promise.all([searchParams, getCurrentProfile()]);
  const schoolOptions = withLegacyValue(toSelectOptions(SCHOOL_OPTIONS), profile.school);
  const majorOptions = withLegacyValue(toSelectOptions(MAJOR_OPTIONS), profile.major);
  const yearLabelOptions = withLegacyValue(toSelectOptions(YEAR_LABEL_OPTIONS), profile.year_label);
  const fullNameDefault = getSuggestedProfileName(profile.full_name, profile.nu_email);

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
          defaultValue={fullNameDefault}
        />
        <WireSelect
          label="School"
          name="school"
          options={schoolOptions}
          defaultValue={profile.school}
          placeholder="Select school"
        />
        <WireSelect
          label="Major"
          name="major"
          options={majorOptions}
          defaultValue={profile.major}
          placeholder="Select major"
        />
        <WireSelect
          label="Year"
          name="yearLabel"
          options={yearLabelOptions}
          defaultValue={profile.year_label}
          placeholder="Select year"
        />
        <WireTextarea label="Short bio" name="bio" defaultValue={profile.bio} rows={4} />
        <SubmitButton label="Continue" pendingLabel="Saving..." variant="primary" />
      </form>
    </main>
  );
}
