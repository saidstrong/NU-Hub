import Link from "next/link";
import { FeedbackBanner } from "@/components/ui/FeedbackBanner";
import { QuickAccessGrid } from "@/components/ui/QuickAccessGrid";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { ShellButton } from "@/components/ui/ShellButton";
import { TagChip } from "@/components/ui/TagChip";
import { getCurrentProfile } from "@/lib/profile/data";
import { toPublicStorageUrl } from "@/lib/validation/media";

const quickAccessItems = [
  { label: "My Listings", href: "/market/my-listings", meta: "Track active and sold items" },
  { label: "Saved Listings", href: "/market/saved", meta: "Items to revisit" },
  { label: "My Events", href: "/events/my-events", meta: "Going and interested activity" },
  { label: "Saved Events", href: "/events/saved", meta: "Events to track" },
  { label: "My Communities", href: "/connect/my-communities", meta: "Joined and created circles" },
  { label: "Notifications", href: "/profile/notifications", meta: "Recent updates" },
];

type ProfilePageProps = {
  searchParams: Promise<{
    message?: string;
  }>;
};

function joinLine(parts: Array<string | null>): string {
  const safeParts = parts.map((part) => (part ?? "").trim()).filter(Boolean);
  return safeParts.length > 0 ? safeParts.join(" | ") : "";
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

function parseProfileExtras(links: unknown): {
  telegram: string | null;
  instagram: string | null;
  relationshipStatus: string | null;
} {
  if (!links || typeof links !== "object" || Array.isArray(links)) {
    return { telegram: null, instagram: null, relationshipStatus: null };
  }

  const source = links as Record<string, unknown>;
  const readValue = (key: string): string | null => {
    const value = source[key];
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  };

  return {
    telegram: readValue("telegram"),
    instagram: readValue("instagram"),
    relationshipStatus: readValue("relationship_status"),
  };
}

function formatHandle(value: string | null): string | null {
  if (!value) return null;
  return value.startsWith("@") ? value : `@${value}`;
}

function EmptyText({ text }: { text: string }) {
  return (
    <div className="wire-inline-empty">
      {text}
    </div>
  );
}

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const [{ message }, profile] = await Promise.all([searchParams, getCurrentProfile()]);
  const subtitle = joinLine([profile.school, profile.major, profile.year_label]);
  const projects = parseProjects(profile.projects);
  const links = parseLinks(profile.links);
  const extras = parseProfileExtras(profile.links);
  const avatarUrl = toPublicStorageUrl("avatars", profile.avatar_path);
  const name = profile.full_name || "NU student";
  const profileContext = subtitle || "Campus student profile";
  const telegramHandle = formatHandle(extras.telegram);
  const instagramHandle = formatHandle(extras.instagram);
  const hasPublicLinks = Boolean(profile.resume_url || links.length > 0);
  const hasSocialHandles = Boolean(telegramHandle || instagramHandle);
  const bioText = typeof profile.bio === "string" ? profile.bio.trim() : "";

  return (
    <main>
      <section className="wire-panel">
        <SectionHeader
          title="Profile"
          actionNode={
            <Link href="/profile/settings" className="wire-link">
              Settings
            </Link>
          }
        />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt={`${name} avatar`}
                className="h-16 w-16 shrink-0 rounded-full border border-wire-700 bg-wire-900 object-cover"
              />
            ) : (
              <div className="h-16 w-16 shrink-0 rounded-full border border-dashed border-wire-600 bg-wire-900" />
            )}
            <div className="min-w-0">
              <p className="wire-label">Campus identity</p>
              <h2 className="mt-1 break-words text-[30px] font-semibold leading-[36px] tracking-tight text-wire-100">
                {name}
              </h2>
              <p className="mt-2 text-[14px] text-wire-300">{profileContext}</p>
            </div>
          </div>
          <div className="hidden sm:flex sm:items-center">
            <Link href="/profile/notifications" className="wire-action-compact">
              Notifications
            </Link>
          </div>
        </div>

        {message ? <FeedbackBanner tone="success" message={message} className="mt-4" /> : null}

        <div className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <ShellButton label="Edit profile" href="/profile/edit" variant="primary" />
          <Link href="/profile/notifications" className="wire-action w-full sm:hidden">
            Notifications
          </Link>
          <Link href="/profile/settings" className="wire-action w-full">
            Settings
          </Link>
        </div>

        {profile.interests.length > 0 ? (
          <div className="mt-5 border-t border-wire-700 pt-4">
            <p className="mb-2 wire-label">Top interests</p>
            <div className="flex flex-wrap gap-2">
              {profile.interests.slice(0, 4).map((item) => (
                <TagChip key={item} label={item} />
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard title="About">
          {bioText ? (
            <p className="text-[14px] leading-relaxed text-wire-200">{bioText}</p>
          ) : (
            <EmptyText text="Add a short bio so other students understand what you focus on." />
          )}
        </SectionCard>

        <SectionCard title="Academic and campus context">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <div className="rounded-[var(--radius-input)] border border-wire-700 bg-wire-800 px-4 py-3">
              <p className="wire-label">School</p>
              <p className="mt-2 text-[14px] text-wire-100">
                {profile.school || <span className="text-wire-300">Not added</span>}
              </p>
            </div>
            <div className="rounded-[var(--radius-input)] border border-wire-700 bg-wire-800 px-4 py-3">
              <p className="wire-label">Major</p>
              <p className="mt-2 text-[14px] text-wire-100">
                {profile.major || <span className="text-wire-300">Not added</span>}
              </p>
            </div>
            <div className="rounded-[var(--radius-input)] border border-wire-700 bg-wire-800 px-4 py-3">
              <p className="wire-label">Year</p>
              <p className="mt-2 text-[14px] text-wire-100">
                {profile.year_label || <span className="text-wire-300">Not added</span>}
              </p>
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="Interests and goals">
          <div>
            <p className="mb-2 wire-label">Interests</p>
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

          <div className="border-t border-wire-700 pt-4">
            <p className="mb-2 wire-label">Goals</p>
            {profile.goals.length > 0 ? (
              <div className="space-y-2">
                {profile.goals.map((goal) => (
                  <div
                    key={goal}
                    className="rounded-[var(--radius-input)] border border-wire-700 bg-wire-800 px-4 py-2.5 text-[13px] text-wire-200"
                  >
                    {goal}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyText text="No goals added yet." />
            )}
          </div>

          <div className="border-t border-wire-700 pt-4">
            <p className="mb-2 wire-label">Looking for</p>
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
        </SectionCard>

        <SectionCard title="Public links and socials">
          <div>
            <p className="mb-2 wire-label">Professional details</p>
            <div className="space-y-2">
              {profile.resume_url ? (
                <p className="text-[13px] text-wire-300">
                  Resume
                  <span className="ml-2 text-wire-200">{profile.resume_url}</span>
                </p>
              ) : null}
              {links.map((item) => (
                <p key={item.label} className="text-[13px] text-wire-300">
                  {item.label}
                  <span className="ml-2 text-wire-200">{item.value}</span>
                </p>
              ))}
              {!hasPublicLinks ? (
                <EmptyText text="No public links added yet." />
              ) : null}
            </div>
          </div>

          <div className="border-t border-wire-700 pt-4">
            <p className="mb-2 wire-label">Social handles</p>
            {hasSocialHandles ? (
              <div className="space-y-2">
                {telegramHandle ? (
                  <p className="text-[13px] text-wire-300">
                    Telegram
                    <span className="ml-2 text-wire-200">{telegramHandle}</span>
                  </p>
                ) : null}
                {instagramHandle ? (
                  <p className="text-[13px] text-wire-300">
                    Instagram
                    <span className="ml-2 text-wire-200">{instagramHandle}</span>
                  </p>
                ) : null}
              </div>
            ) : (
              <EmptyText text="No social handles added yet." />
            )}
          </div>

          {extras.relationshipStatus ? (
            <div className="border-t border-wire-700 pt-4">
              <p className="mb-2 wire-label">Relationship status (private)</p>
              <p className="text-[13px] text-wire-200">{extras.relationshipStatus}</p>
            </div>
          ) : null}

          <div className="border-t border-wire-700 pt-4">
            <p className="mb-2 wire-label">Skills</p>
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

          <div className="border-t border-wire-700 pt-4">
            <p className="mb-2 wire-label">Projects</p>
            {projects.length > 0 ? (
              <div className="space-y-2">
                {projects.map((project) => (
                  <div
                    key={`${project.title}-${project.summary ?? ""}`}
                    className="rounded-[var(--radius-input)] border border-wire-700 bg-wire-800 px-4 py-3"
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
        </SectionCard>
      </div>

      <SectionCard
        title="Quick access"
        actionLabel="Settings"
        actionHref="/profile/settings"
      >
        <QuickAccessGrid items={quickAccessItems} columns={2} />
      </SectionCard>
    </main>
  );
}
