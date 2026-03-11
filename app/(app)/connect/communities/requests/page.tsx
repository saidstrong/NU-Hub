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

  return (
    <main>
      <TopBar
        title="Join Requests"
        subtitle="Review incoming requests for your communities"
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

      {requests.length > 0 ? (
        <div className="wire-list">
          {requests.map((request) => (
            <div key={`${request.community_id}:${request.user_id}`} className="wire-card">
              <p className="text-sm font-semibold text-wire-100">{request.requester_name}</p>
              <p className="mt-1 wire-meta">{request.requester_meta}</p>
              <p className="mt-1 wire-meta">Community: {request.community_name}</p>
              <p className="mb-3 mt-2 text-[13px] leading-relaxed text-wire-200">{request.note}</p>
              <div className="wire-action-row">
                <form action={reviewCommunityRequestAction} className="w-full">
                  <input type="hidden" name="communityId" value={request.community_id} />
                  <input type="hidden" name="userId" value={request.user_id} />
                  <input type="hidden" name="decision" value="approve" />
                  <SubmitButton
                    label="Approve"
                    pendingLabel="Approving..."
                    variant="primary"
                  />
                </form>
                <form action={reviewCommunityRequestAction} className="w-full">
                  <input type="hidden" name="communityId" value={request.community_id} />
                  <input type="hidden" name="userId" value={request.user_id} />
                  <input type="hidden" name="decision" value="reject" />
                  <SubmitButton
                    label="Reject"
                    pendingLabel="Rejecting..."
                  />
                </form>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {requests.length === 0 && !loadError ? (
        <EmptyState
          title="No pending join requests"
          description="Incoming community membership requests will appear here."
          actionLabel="Back to communities"
          actionHref="/connect/communities"
        />
      ) : null}
    </main>
  );
}
