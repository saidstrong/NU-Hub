import Link from "next/link";
import { FormSection } from "@/components/ui/FormSection";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { TopBar } from "@/components/ui/TopBar";
import { WireField, WireTextarea } from "@/components/ui/WireField";
import { getCurrentProfile } from "@/lib/profile/data";
import { updateProfileAction } from "@/lib/profile/actions";

type EditProfilePageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

function linksToDefaults(links: unknown) {
  if (!links || typeof links !== "object" || Array.isArray(links)) {
    return { github: "", linkedin: "", portfolio: "" };
  }

  const source = links as Record<string, unknown>;
  return {
    github: typeof source.github === "string" ? source.github : "",
    linkedin: typeof source.linkedin === "string" ? source.linkedin : "",
    portfolio: typeof source.portfolio === "string" ? source.portfolio : "",
  };
}

function projectsToText(projects: unknown) {
  if (!Array.isArray(projects)) return "";

  return projects
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return "";
      const title = typeof item.title === "string" ? item.title : "";
      const summary = typeof item.summary === "string" ? item.summary : "";
      if (!title) return "";
      return summary ? `${title} - ${summary}` : title;
    })
    .filter(Boolean)
    .join("\n");
}

export default async function EditProfilePage({ searchParams }: EditProfilePageProps) {
  const [{ error }, profile] = await Promise.all([searchParams, getCurrentProfile()]);
  const linkDefaults = linksToDefaults(profile.links);

  return (
    <main>
      <TopBar
        title="Edit Profile"
        subtitle="Update profile sections used across NU Atrium"
        backHref="/profile"
      />
      {error ? (
        <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-[13px] text-red-200">
          {error}
        </div>
      ) : null}

      <form action={updateProfileAction} className="flex flex-col gap-5">
        <FormSection
          title="Basic info"
          description="Core identity details visible in your student profile."
        >
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
          <WireTextarea label="Bio" name="bio" defaultValue={profile.bio} rows={4} />
        </FormSection>

        <FormSection
          title="Interests and goals"
          description="Help peers and communities understand your focus."
        >
          <WireField
            label="Interests (comma separated)"
            name="interestsInput"
            defaultValue={profile.interests.join(", ")}
          />
          <WireField
            label="Goals (comma separated)"
            name="goalsInput"
            defaultValue={profile.goals.join(", ")}
          />
          <WireField
            label="Looking for (comma separated)"
            name="lookingForInput"
            defaultValue={profile.looking_for.join(", ")}
          />
        </FormSection>

        <FormSection
          title="Professional details (optional)"
          description="Share only what is useful for campus collaboration."
        >
          <WireField
            label="Skills (comma separated)"
            name="skillsInput"
            defaultValue={profile.skills.join(", ")}
          />
          <WireTextarea
            label="Projects (one per line, optional ' - summary')"
            name="projectsInput"
            defaultValue={projectsToText(profile.projects)}
            rows={5}
          />
          <WireField label="Resume/CV link" name="resumeUrl" defaultValue={profile.resume_url} />
          <WireField label="GitHub" name="githubUrl" defaultValue={linkDefaults.github} />
          <WireField label="LinkedIn" name="linkedinUrl" defaultValue={linkDefaults.linkedin} />
          <WireField label="Portfolio" name="portfolioUrl" defaultValue={linkDefaults.portfolio} />
        </FormSection>

        <div className="wire-action-row">
          <Link href="/profile" className="wire-action">
            Cancel
          </Link>
          <SubmitButton label="Save changes" pendingLabel="Saving..." variant="primary" />
        </div>
      </form>
    </main>
  );
}
