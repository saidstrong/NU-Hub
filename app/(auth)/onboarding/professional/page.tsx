import { FormSection } from "@/components/ui/FormSection";
import {
  completeOnboardingAction,
  skipOnboardingProfessionalAction,
} from "@/lib/profile/actions";
import { getCurrentProfile } from "@/lib/profile/data";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { TopBar } from "@/components/ui/TopBar";
import { WireField, WireTextarea } from "@/components/ui/WireField";

type OnboardingProfessionalPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

function getLinkValue(
  links: unknown,
  key: "github" | "linkedin" | "portfolio",
): string {
  if (!links || typeof links !== "object" || Array.isArray(links)) {
    return "";
  }

  const value = (links as Record<string, unknown>)[key];
  return typeof value === "string" ? value : "";
}

function projectsToLines(projects: unknown): string {
  if (!Array.isArray(projects)) return "";

  return projects
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return "";
      }

      const title = typeof item.title === "string" ? item.title : "";
      const summary = typeof item.summary === "string" ? item.summary : "";
      if (!title) return "";
      return summary ? `${title} - ${summary}` : title;
    })
    .filter(Boolean)
    .join("\n");
}

export default async function OnboardingProfessionalPage({
  searchParams,
}: OnboardingProfessionalPageProps) {
  const [{ error }, profile] = await Promise.all([searchParams, getCurrentProfile()]);

  return (
    <main>
      <TopBar
        title="Onboarding"
        subtitle="Professional profile (optional)"
        backHref="/onboarding/looking-for"
      />
      <form action={completeOnboardingAction} className="flex flex-col gap-5">
        {error ? (
          <div className="wire-panel border-red-400/30 bg-red-400/10 px-3 py-2 text-[13px] text-red-200">
            {error}
          </div>
        ) : null}
        <FormSection title="Skills">
          <WireField
            label="Add skills"
            name="skillsInput"
            defaultValue={profile.skills.join(", ")}
            placeholder="TypeScript, Data analysis, UI design"
          />
        </FormSection>
        <FormSection title="Projects">
          <WireTextarea
            label="Project summary"
            name="projectsInput"
            defaultValue={projectsToLines(profile.projects)}
            placeholder="Project title - short summary"
            rows={5}
          />
        </FormSection>
        <FormSection title="Resume link">
          <WireField
            label="URL"
            name="resumeUrl"
            defaultValue={profile.resume_url}
            placeholder="https://..."
          />
        </FormSection>
        <FormSection title="GitHub / LinkedIn / Portfolio">
          <WireField
            label="GitHub"
            name="githubUrl"
            defaultValue={getLinkValue(profile.links, "github")}
            placeholder="https://github.com/username"
          />
          <WireField
            label="LinkedIn"
            name="linkedinUrl"
            defaultValue={getLinkValue(profile.links, "linkedin")}
            placeholder="https://linkedin.com/in/username"
          />
          <WireField
            label="Portfolio"
            name="portfolioUrl"
            defaultValue={getLinkValue(profile.links, "portfolio")}
            placeholder="https://..."
          />
        </FormSection>
        <div className="wire-action-row">
          <SubmitButton label="Finish" pendingLabel="Saving..." variant="primary" />
          <button formAction={skipOnboardingProfessionalAction} className="wire-action">
            Skip
          </button>
        </div>
      </form>
    </main>
  );
}
