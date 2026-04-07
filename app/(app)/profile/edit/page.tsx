import Link from "next/link";
import { FormSection } from "@/components/ui/FormSection";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { TopBar } from "@/components/ui/TopBar";
import { WireField, WireSelect, WireTextarea } from "@/components/ui/WireField";
import {
  MAJOR_OPTIONS,
  SCHOOL_OPTIONS,
  YEAR_LABEL_OPTIONS,
  toSelectOptions,
  withLegacyValue,
} from "@/lib/profile/academic-options";
import { getSuggestedProfileName } from "@/lib/profile/name-suggestion";
import { getCurrentProfile } from "@/lib/profile/data";
import { updateProfileAction } from "@/lib/profile/actions";

type EditProfilePageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

function linksToDefaults(links: unknown) {
  if (!links || typeof links !== "object" || Array.isArray(links)) {
    return {
      github: "",
      linkedin: "",
      portfolio: "",
      telegram: "",
      instagram: "",
      relationship_status: "",
      birthday: "",
    };
  }

  const source = links as Record<string, unknown>;
  return {
    github: typeof source.github === "string" ? source.github : "",
    linkedin: typeof source.linkedin === "string" ? source.linkedin : "",
    portfolio: typeof source.portfolio === "string" ? source.portfolio : "",
    telegram: typeof source.telegram === "string" ? source.telegram : "",
    instagram: typeof source.instagram === "string" ? source.instagram : "",
    relationship_status:
      typeof source.relationship_status === "string" ? source.relationship_status : "",
    birthday: typeof source.birthday === "string" ? source.birthday : "",
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
  const schoolOptions = withLegacyValue(toSelectOptions(SCHOOL_OPTIONS), profile.school);
  const majorOptions = withLegacyValue(toSelectOptions(MAJOR_OPTIONS), profile.major);
  const yearLabelOptions = withLegacyValue(toSelectOptions(YEAR_LABEL_OPTIONS), profile.year_label);
  const fullNameDefault = getSuggestedProfileName(profile.full_name, profile.nu_email);

  return (
    <main>
      <TopBar
        title="Edit Profile"
        subtitle="Keep your campus identity and profile details clear and current."
        backHref="/profile"
      />
      {error ? (
        <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-[13px] text-red-200">
          {error}
        </div>
      ) : null}

      <form action={updateProfileAction} className="flex flex-col gap-5" encType="multipart/form-data">
        <FormSection
          title="Identity basics"
          description="The core details other students use to understand who you are."
        >
          <label className="block space-y-2">
            <span className="wire-label">Avatar (optional)</span>
            <input
              name="avatar"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="wire-input-field py-2.5"
            />
            <p className="wire-meta">JPEG, PNG, WEBP. Max 5MB.</p>
          </label>
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
          <WireTextarea label="Bio" name="bio" defaultValue={profile.bio} rows={4} />
        </FormSection>

        <FormSection
          title="Interests and goals"
          description="Show what you care about and how people can connect with you."
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
          description="Add only the public links and details that help with campus collaboration."
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
          <WireField
            label="Telegram"
            name="telegramNickname"
            defaultValue={linkDefaults.telegram}
            placeholder="@nickname"
          />
          <WireField
            label="Instagram"
            name="instagramNickname"
            defaultValue={linkDefaults.instagram}
            placeholder="@nickname"
          />
          <WireField
            label="Relationship status"
            name="relationshipStatus"
            defaultValue={linkDefaults.relationship_status}
          />
          <WireField
            label="Birthday (private)"
            name="birthday"
            defaultValue={linkDefaults.birthday}
            type="date"
          />
        </FormSection>

        <div className="wire-action-row">
          <Link href="/profile" className="wire-action">
            Cancel
          </Link>
          <SubmitButton label="Save profile" pendingLabel="Saving..." variant="primary" />
        </div>
      </form>
    </main>
  );
}
