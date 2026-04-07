import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { TopBar } from "@/components/ui/TopBar";
import { reviewCommunityRequestAction } from "@/lib/connect/actions";
import { getOwnerPendingCommunityRequests } from "@/lib/connect/data";

type CommunityRequestsPageProps = {
  searchParams: Promise<{
    message?: string;
    error?: string;
  }>;
};

export default async function CommunityRequestsPage({ searchParams }: CommunityRequestsPageProps) {
  const { message, error } = await searchParams;
  let requests: Awaited<ReturnType<typeof getOwnerPendingCommunityRequests>> = [];
  let loadError: string | null = null;

  try {
    requests = await getOwnerPendingCommunityRequests();
  } catch (loadRequestsError) {
    loadError = loadRequestsError instanceof Error ? loadRequestsError.message : "Failed to load join requests.";
  }

  const requestCountLabel = requests.length === 1
    ? "1 pending request"
    : `${requests.length} pending requests`;

  return (
    <main>
      <TopBar
        title="Join Requests"
        subtitle="Pending community join requests for communities you run."
        backHref="/connect/communities"
        actions={[{ label: "My communities", href: "/connect/my-communities?view=created" }]}
      />
      <section className="wire-panel py-3">
        <p className="wire-label">Owner review queue</p>
        <p className="mt-1 text-[13px] leading-relaxed text-wire-300">
          Review requests across communities you run. The requester context below comes from each student&apos;s existing profile, not from a separate join note.
        </p>
        {!loadError ? (
          <p className="mt-2 text-[12px] font-medium text-wire-200">{requestCountLabel}</p>
        ) : null}
      </section>
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

      {requests.length > 0 ? (
        <div className="wire-list">
          {requests.map((request) => (
            <div key={`${request.community_id}:${request.user_id}`} className="wire-card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="wire-label">Community</p>
                  <Link
                    href={`/connect/communities/${request.community_id}`}
                    className="mt-1 block text-sm font-semibold text-wire-100 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/40"
                  >
                    {request.community_name}
                  </Link>
                </div>
                <span className="rounded-full border border-wire-600 bg-wire-900 px-2 py-0.5 text-[11px] font-medium text-wire-300">
                  Pending review
                </span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
                <div>
                  <p className="wire-label">Requester</p>
                  <Link
                    href={`/connect/people/${request.user_id}`}
                    className="mt-1 block text-[14px] font-medium text-wire-100 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/40"
                  >
                    {request.requester_name}
                  </Link>
                  <p className="mt-1 wire-meta">{request.requester_meta}</p>
                </div>
                <div>
                  <p className="wire-label">Profile context</p>
                  <p className="mt-1 text-[13px] leading-relaxed text-wire-200">
                    {request.note === "Interested in joining this community."
                      ? "No additional profile context available."
                      : request.note}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-[var(--radius-input)] border border-wire-700 bg-wire-800 px-3 py-3">
                <p className="wire-label">Decision</p>
                <p className="mt-1 text-[12px] leading-relaxed text-wire-300">
                  Approve adds this student as a joined member. Reject closes this request without adding them.
                </p>
                <div className="mt-3 wire-action-row">
                  <form action={reviewCommunityRequestAction} className="w-full">
                    <input type="hidden" name="communityId" value={request.community_id} />
                    <input type="hidden" name="userId" value={request.user_id} />
                    <input type="hidden" name="decision" value="approve" />
                    <SubmitButton
                      label="Approve request"
                      pendingLabel="Approving..."
                      variant="primary"
                    />
                  </form>
                  <form action={reviewCommunityRequestAction} className="w-full">
                    <input type="hidden" name="communityId" value={request.community_id} />
                    <input type="hidden" name="userId" value={request.user_id} />
                    <input type="hidden" name="decision" value="reject" />
                    <SubmitButton
                      label="Reject request"
                      pendingLabel="Rejecting..."
                    />
                  </form>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {requests.length === 0 && !loadError ? (
        <EmptyState
          title="No requests waiting for review"
          description="Pending requests for request-to-join communities will appear here when one of your communities needs owner review."
          actionLabel="Open my communities"
          actionHref="/connect/my-communities?view=created"
        />
      ) : null}
    </main>
  );
}
