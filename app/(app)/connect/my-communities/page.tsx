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
  const viewSummary = selectedView === "joined"
    ? "Communities where you already belong. Open one to follow updates, review members, or take part."
    : selectedView === "created"
      ? "Communities you run or own. Open one to manage requests, edit details, and keep members updated."
      : "Community requests still waiting for owner review. Open a community to review details while you wait.";
  const viewCountLabel = communities.length === 1
    ? "1 community on this page"
    : `${communities.length} communities on this page`;
  const emptyStateTitle = selectedView === "joined"
    ? "No joined communities yet"
    : selectedView === "created"
      ? "No communities run by you yet"
      : "No pending community requests";
  const emptyStateDescription = selectedView === "joined"
    ? "Communities you join will stay here so you can return to their updates and member context."
    : selectedView === "created"
      ? "Create a community to start running a campus group, club, or student initiative from Atrium."
      : "Requests waiting for owner approval will appear here until they are approved or declined.";
  const emptyStateActionLabel = selectedView === "created" ? "Create community" : "Browse communities";
  const emptyStateActionHref = selectedView === "created" ? "/connect/communities/create" : "/connect/communities";

  return (
    <main>
      <TopBar
        title="My Communities"
        subtitle="Track communities you belong to, run, or are still waiting to join"
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

      <section className="wire-panel py-3">
        <p className="wire-label">Current view</p>
        <p className="mt-1 text-[13px] leading-relaxed text-wire-300">
          {viewSummary}
        </p>
        {!loadError ? (
          <p className="mt-2 text-[12px] font-medium text-wire-200">{viewCountLabel}</p>
        ) : null}
      </section>

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
          title={emptyStateTitle}
          description={emptyStateDescription}
          actionLabel={emptyStateActionLabel}
          actionHref={emptyStateActionHref}
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
