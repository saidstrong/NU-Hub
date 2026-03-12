import { FormSection } from "@/components/ui/FormSection";
import { ProfileHeader } from "@/components/ui/ProfileHeader";
import { QuickAccessGrid } from "@/components/ui/QuickAccessGrid";
import { SectionCard } from "@/components/ui/SectionCard";
import { TagChip } from "@/components/ui/TagChip";
import { TopBar } from "@/components/ui/TopBar";
import { getCurrentProfile } from "@/lib/profile/data";
import { toPublicStorageUrl } from "@/lib/validation/media";

const quickAccessItems = [
  { label: "My Listings", href: "/market/my-listings", meta: "Active and sold posts" },
  { label: "Saved Listings", href: "/market/saved", meta: "Items to revisit" },
  { label: "My Events", href: "/events/my-events", meta: "Interested and joined" },
  { label: "Saved Events", href: "/events/saved", meta: "Events to track" },
  { label: "My Communities", href: "/connect/my-communities", meta: "Joined and created groups" },
  { label: "Notifications", href: "/profile/notifications", meta: "Recent updates" },
];

type ProfilePageProps = {
  searchParams: Promise<{
    message?: string;
  }>;
};

function joinLine(parts: Array<string | null>): string {
  const safeParts = parts.map((part) => (part ?? "").trim()).filter(Boolean);
  return safeParts.length > 0 ? safeParts.join(" - ") : "Campus student profile";
}

function parseProjects(projects: unknown): Array<{ title: string; summary?: string }> {
  if (!Array.isArray(projects)) return [];

  return projects
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const title = typeof item.title === "string" ? item.title.trim() : "";
      const summary = typeof item.summary === "string" ? item.summary.trim() : "";
      if (!title) return null;
      return summary ? { title, summary } : { title };
    })
    .filter((item): item is { title: string; summary?: string } => item !== null);
}

function parseLinks(links: unknown): Array<{ label: string; value: string }> {
  if (!links || typeof links !== "object" || Array.isArray(links)) return [];

  const source = links as Record<string, unknown>;
  const items: Array<{ key: "github" | "linkedin" | "portfolio"; label: string }> = [
    { key: "github", label: "GitHub" },
    { key: "linkedin", label: "LinkedIn" },
    { key: "portfolio", label: "Portfolio" },
  ];

  return items
    .map(({ key, label }) => {
      const value = source[key];
      if (typeof value !== "string" || !value.trim()) return null;
      return { label, value };
    })
    .filter((item): item is { label: string; value: string } => item !== null);
}

function EmptyText({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-wire-600 bg-wire-900/60 px-3 py-2.5 text-[13px] text-wire-300">
      {text}
    </div>
  );
}

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const [{ message }, profile] = await Promise.all([searchParams, getCurrentProfile()]);
  const subtitle = joinLine([profile.school, profile.major, profile.year_label]);
  const projects = parseProjects(profile.projects);
  const links = parseLinks(profile.links);
  const avatarUrl = toPublicStorageUrl("avatars", profile.avatar_path);

  return (
    <main>
      <TopBar
        title="Profile"
        subtitle="Your campus identity and collaboration profile"
        actions={[{ label: "Settings", href: "/profile/settings" }]}
      />
      {message ? (
        <div className="rounded-xl border border-accent/35 bg-accent/10 px-3 py-2 text-[13px] text-wire-100">
          {message}
        </div>
      ) : null}

      <ProfileHeader
        name={profile.full_name || "NU student"}
        subtitle={subtitle}
        contextLabel="Campus profile"
        tags={profile.interests.slice(0, 3)}
        avatarUrl={avatarUrl}
        actions={[{ label: "Edit profile", href: "/profile/edit" }]}
      />

      <FormSection
        title="About"
        description="Short context for classmates, collaborators, and communities."
      >
        {profile.bio ? (
          <p className="text-sm leading-relaxed text-wire-200">{profile.bio}</p>
        ) : (
          <EmptyText text="Add a short bio to give classmates context for collaboration." />
        )}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-wire-700 bg-wire-800 px-3 py-2.5">
            <p className="wire-meta">School</p>
            <p className="mt-1 text-sm text-wire-100">{profile.school || "Not set"}</p>
          </div>
          <div className="rounded-xl border border-wire-700 bg-wire-800 px-3 py-2.5">
            <p className="wire-meta">Major</p>
            <p className="mt-1 text-sm text-wire-100">{profile.major || "Not set"}</p>
          </div>
          <div className="rounded-xl border border-wire-700 bg-wire-800 px-3 py-2.5">
            <p className="wire-meta">Year</p>
            <p className="mt-1 text-sm text-wire-100">{profile.year_label || "Not set"}</p>
          </div>
        </div>
      </FormSection>

      <FormSection
        title="Interests and goals"
        description="Helps peers understand your focus and preferred collaboration context."
      >
        <div>
          <p className="mb-2 wire-meta">Interests</p>
          {profile.interests.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {profile.interests.map((item) => (
                <TagChip key={item} label={item} />
              ))}
            </div>
          ) : (
            <EmptyText text="No interests added yet." />
          )}
        </div>

        <div className="border-t border-wire-700 pt-3">
          <p className="mb-2 wire-meta">Goals</p>
          {profile.goals.length > 0 ? (
            <div className="space-y-2">
              {profile.goals.map((goal) => (
                <div
                  key={goal}
                  className="rounded-xl border border-wire-700 bg-wire-800 px-3 py-2 text-[13px] text-wire-200"
                >
                  {goal}
                </div>
              ))}
            </div>
          ) : (
            <EmptyText text="No goals added yet." />
          )}
        </div>

        <div className="border-t border-wire-700 pt-3">
          <p className="mb-2 wire-meta">Looking for</p>
          {profile.looking_for.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {profile.looking_for.map((item, idx) => (
                <TagChip key={item} label={item} active={idx === 0} />
              ))}
            </div>
          ) : (
            <EmptyText text="No collaboration preferences added yet." />
          )}
        </div>
      </FormSection>

      <FormSection
        title="Professional details (optional)"
        description="Lightweight context for project and community collaboration."
      >
        <div>
          <p className="mb-2 wire-meta">Skills</p>
          {profile.skills.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {profile.skills.map((item) => (
                <TagChip key={item} label={item} />
              ))}
            </div>
          ) : (
            <EmptyText text="No skills listed." />
          )}
        </div>

        <div className="border-t border-wire-700 pt-3">
          <p className="mb-2 wire-meta">Projects</p>
          {projects.length > 0 ? (
            <div className="space-y-2">
              {projects.map((project) => (
                <div
                  key={`${project.title}-${project.summary ?? ""}`}
                  className="rounded-xl border border-wire-700 bg-wire-800 px-3 py-2"
                >
                  <p className="text-[13px] font-medium text-wire-100">{project.title}</p>
                  {project.summary ? (
                    <p className="mt-1 text-[12px] text-wire-300">{project.summary}</p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <EmptyText text="No projects added." />
          )}
        </div>

        {profile.resume_url || links.length > 0 ? (
          <div className="rounded-xl border border-wire-700 bg-wire-800 px-3 py-3">
            <p className="text-[13px] font-medium text-wire-100">Links</p>
            <div className="mt-2 space-y-1.5">
              {profile.resume_url ? (
                <p className="text-[12px] text-wire-300">
                  Resume: <span className="text-wire-200">{profile.resume_url}</span>
                </p>
              ) : null}
              {links.map((item) => (
                <p key={item.label} className="text-[12px] text-wire-300">
                  {item.label}: <span className="text-wire-200">{item.value}</span>
                </p>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-wire-600 bg-wire-900/60 px-3 py-3">
            <p className="text-[13px] font-medium text-wire-200">No CV or profile links added</p>
            <p className="mt-1 wire-meta">
              Optional. Add only if it helps with campus opportunities and collaboration.
            </p>
          </div>
        )}
      </FormSection>

      <SectionCard title="Quick Access" actionLabel="Settings" actionHref="/profile/settings">
        <QuickAccessGrid items={quickAccessItems} columns={2} />
      </SectionCard>
    </main>
  );
}
