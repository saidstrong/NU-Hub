import { updateOnboardingInterestsAction } from "@/lib/profile/actions";
import { getCurrentProfile } from "@/lib/profile/data";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { TopBar } from "@/components/ui/TopBar";
import { interestChips } from "@/lib/mock-data";

type OnboardingInterestsPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function OnboardingInterestsPage({
  searchParams,
}: OnboardingInterestsPageProps) {
  const [{ error }, profile] = await Promise.all([searchParams, getCurrentProfile()]);
  const selectedInterests = new Set(profile.interests);

  return (
    <main>
      <TopBar
        title="Onboarding"
        subtitle="Choose your interests"
        backHref="/onboarding/profile"
      />
      <form action={updateOnboardingInterestsAction} className="wire-panel">
        {error ? (
          <div className="mb-3 rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-[13px] text-red-200">
            {error}
          </div>
        ) : null}
        <div className="mb-4 flex flex-wrap gap-2">
          {interestChips.map((chip) => (
            <label key={chip}>
              <input
                type="checkbox"
                name="interests"
                value={chip}
                defaultChecked={selectedInterests.has(chip)}
                className="peer sr-only"
              />
              <span className="inline-flex min-h-9 items-center rounded-xl border border-wire-600 bg-wire-800 px-3 py-1.5 text-[12px] font-medium text-wire-200 transition-colors duration-150 peer-checked:border-accent/45 peer-checked:bg-accent/10 peer-checked:text-wire-100 hover:border-wire-500 hover:text-wire-100">
                {chip}
              </span>
            </label>
          ))}
        </div>
        <SubmitButton label="Continue" pendingLabel="Saving..." variant="primary" />
      </form>
    </main>
  );
}
