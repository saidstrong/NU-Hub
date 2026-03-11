import { CommunityCard } from "@/components/ui/CommunityCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { TabRow } from "@/components/ui/TabRow";
import { TopBar } from "@/components/ui/TopBar";
import { getMyCommunities, toCommunityCardData } from "@/lib/connect/data";

type MyCommunitiesPageProps = {
  searchParams: Promise<{
    view?: string;
    message?: string;
    error?: string;
  }>;
};

function parseView(value?: string): "joined" | "created" | "pending" {
  if (value === "created" || value === "pending") return value;
  return "joined";
}

export default async function MyCommunitiesPage({ searchParams }: MyCommunitiesPageProps) {
  const { view, message, error } = await searchParams;
  const selectedView = parseView(view);
  const activeIndex = selectedView === "joined" ? 0 : selectedView === "created" ? 1 : 2;

  let communities: Awaited<ReturnType<typeof getMyCommunities>> = [];
  let loadError: string | null = null;

  try {
    communities = await getMyCommunities(selectedView);
  } catch (loadCommunitiesError) {
    loadError = loadCommunitiesError instanceof Error
      ? loadCommunitiesError.message
      : "Failed to load your communities.";
  }

  return (
    <main>
      <TopBar
        title="My Communities"
        subtitle="Overview of joined, created, and pending communities"
        backHref="/connect/communities"
      />
      {message ? (
        <div className="rounded-xl border border-accent/35 bg-accent/10 px-3 py-2 text-[13px] text-wire-100">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-[13px] text-red-200">
          {error}
        </div>
      ) : null}
      {loadError ? (
        <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-[13px] text-red-200">
          {loadError}
        </div>
      ) : null}

      <TabRow
        tabs={[
          { label: "Joined", href: "/connect/my-communities?view=joined" },
          { label: "Created", href: "/connect/my-communities?view=created" },
          { label: "Pending", href: "/connect/my-communities?view=pending" },
        ]}
        activeIndex={activeIndex}
      />

      {communities.length > 0 ? (
        <div className="wire-list">
          {communities.map((entry) => (
            <CommunityCard
              key={entry.community.id}
              community={toCommunityCardData(entry.community, entry.memberCount, {
                status: entry.status,
              })}
              href={`/connect/communities/${entry.community.id}`}
            />
          ))}
        </div>
      ) : null}

      {communities.length === 0 && !loadError ? (
        <EmptyState
          title={`No ${selectedView} communities yet`}
          description={
            selectedView === "created"
              ? "Create a community and it will appear here."
              : selectedView === "pending"
                ? "Pending join requests will appear here."
                : "Communities you join will appear here."
          }
          actionLabel={selectedView === "created" ? "Create community" : "Browse communities"}
          actionHref={
            selectedView === "created" ? "/connect/communities/create" : "/connect/communities"
          }
        />
      ) : null}
    </main>
  );
}
