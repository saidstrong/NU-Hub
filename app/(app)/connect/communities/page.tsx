import Link from "next/link";
import { CommunityCard } from "@/components/ui/CommunityCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageNavigation } from "@/components/ui/PageNavigation";
import { SectionCard } from "@/components/ui/SectionCard";
import { TopBar } from "@/components/ui/TopBar";
import { getCommunitiesPage, toCommunityCardData } from "@/lib/connect/data";
import { buildPageHref, parsePageParam } from "@/lib/pagination";

type CommunitiesDiscoveryPageProps = {
  searchParams: Promise<{
    message?: string;
    error?: string;
    page?: string;
  }>;
};

const COMMUNITIES_PAGE_SIZE = 12;

export default async function CommunitiesDiscoveryPage({
  searchParams,
}: CommunitiesDiscoveryPageProps) {
  const { message, error, page: pageParam } = await searchParams;
  const page = parsePageParam(pageParam);
  let communities: Awaited<ReturnType<typeof getCommunitiesPage>>["items"] = [];
  let hasMore = false;
  let loadError: string | null = null;

  try {
    const pagedCommunities = await getCommunitiesPage(page, COMMUNITIES_PAGE_SIZE);
    communities = pagedCommunities.items;
    hasMore = pagedCommunities.hasMore;
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Failed to load communities.";
  }

  const previousHref = page > 1 ? buildPageHref("/connect/communities", page - 1) : undefined;
  const nextHref = hasMore ? buildPageHref("/connect/communities", page + 1) : undefined;

  return (
    <main>
      <TopBar
        title="Communities"
        subtitle="The front door to campus groups you can discover, join, and run"
        backHref="/connect"
        actions={[{ label: "Create", href: "/connect/communities/create" }]}
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

      <section className="wire-panel py-3">
        <p className="wire-label">Community hub</p>
        <p className="mt-1 text-[13px] leading-relaxed text-wire-300">
          Browse active student groups, open a community to review its lead and join access, or
          return to the communities you already belong to or operate.
        </p>
      </section>

      <SectionCard
        title="Student communities"
        subtitle="Discover clubs, project groups, and student-led units across NU."
      >
        {communities.length > 0 ? (
          <div className="wire-list">
            {communities.map((entry) => (
              <CommunityCard
                key={entry.community.id}
                community={toCommunityCardData(entry.community, entry.memberCount)}
                href={`/connect/communities/${entry.community.id}`}
              />
            ))}
          </div>
        ) : !loadError ? (
          <EmptyState
            title="No communities available yet"
            description="Create the first campus group, club, or student initiative and it will appear here."
            actionLabel="Create community"
            actionHref="/connect/communities/create"
          />
        ) : null}
      </SectionCard>
      <PageNavigation
        previousHref={previousHref}
        nextHref={nextHref}
        previousLabel="Previous page"
        nextLabel="Next page"
      />

      <section className="wire-panel">
        <div className="mb-3 border-b border-wire-700 pb-3">
          <h2 className="wire-section-title">Community operations</h2>
          <p className="mt-1 wire-meta">
            Review requests you need to handle and return to communities you belong to or run.
          </p>
        </div>
        <div className="wire-action-row">
          <Link href="/connect/communities/requests" className="wire-action">
            Review requests
          </Link>
          <Link href="/connect/my-communities" className="wire-action">
            Your communities
          </Link>
        </div>
      </section>
    </main>
  );
}
