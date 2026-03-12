import { CommunityCard } from "@/components/ui/CommunityCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageNavigation } from "@/components/ui/PageNavigation";
import { TabRow } from "@/components/ui/TabRow";
import { TopBar } from "@/components/ui/TopBar";
import { getMyCommunitiesPage, toCommunityCardData } from "@/lib/connect/data";
import { buildPageHref, parsePageParam } from "@/lib/pagination";

type MyCommunitiesPageProps = {
  searchParams: Promise<{
    view?: string;
    message?: string;
    error?: string;
    page?: string;
  }>;
};

const MY_COMMUNITIES_PAGE_SIZE = 12;

function parseView(value?: string): "joined" | "created" | "pending" {
  if (value === "created" || value === "pending") return value;
  return "joined";
}

export default async function MyCommunitiesPage({ searchParams }: MyCommunitiesPageProps) {
  const { view, message, error, page: pageParam } = await searchParams;
  const selectedView = parseView(view);
  const page = parsePageParam(pageParam);
  const activeIndex = selectedView === "joined" ? 0 : selectedView === "created" ? 1 : 2;

  let communities: Awaited<ReturnType<typeof getMyCommunitiesPage>>["items"] = [];
  let hasMore = false;
  let loadError: string | null = null;

  try {
    const pagedCommunities = await getMyCommunitiesPage(
      selectedView,
      page,
      MY_COMMUNITIES_PAGE_SIZE,
    );
    communities = pagedCommunities.items;
    hasMore = pagedCommunities.hasMore;
  } catch (loadCommunitiesError) {
    loadError = loadCommunitiesError instanceof Error
      ? loadCommunitiesError.message
      : "Failed to load your communities.";
  }

  const previousHref = page > 1
    ? buildPageHref("/connect/my-communities", page - 1, { view: selectedView })
    : undefined;
  const nextHref = hasMore
    ? buildPageHref("/connect/my-communities", page + 1, { view: selectedView })
    : undefined;

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
          { label: "Joined", href: buildPageHref("/connect/my-communities", 1, { view: "joined" }) },
          { label: "Created", href: buildPageHref("/connect/my-communities", 1, { view: "created" }) },
          { label: "Pending", href: buildPageHref("/connect/my-communities", 1, { view: "pending" }) },
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
      <PageNavigation
        previousHref={previousHref}
        nextHref={nextHref}
        previousLabel="Previous page"
        nextLabel="Next page"
      />
    </main>
  );
}
