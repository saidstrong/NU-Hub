import Link from "next/link";
import { CommunityCard } from "@/components/ui/CommunityCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterRow } from "@/components/ui/FilterRow";
import { PageNavigation } from "@/components/ui/PageNavigation";
import { SearchBar } from "@/components/ui/SearchBar";
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
        subtitle="Campus circles, study groups, and student-led initiatives"
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
      <SearchBar placeholder="Search communities" />

      <section className="wire-panel">
        <p className="wire-section-title mb-3">Refine Communities</p>
        <FilterRow filters={["All", "Academic", "Project", "Open", "Request"]} />
      </section>

      <SectionCard title="Student Communities">
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
            title="No communities available"
            description="Communities will appear here as they are created."
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
          <h2 className="wire-section-title">Community management</h2>
          <p className="mt-1 wire-meta">Open requests and view your joined communities.</p>
        </div>
        <div className="wire-action-row">
          <Link href="/connect/communities/requests" className="wire-action">
            Join Requests
          </Link>
          <Link href="/connect/my-communities" className="wire-action">
            My Communities
          </Link>
        </div>
      </section>
    </main>
  );
}
