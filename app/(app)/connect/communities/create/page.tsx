import { EmptyState } from "@/components/ui/EmptyState";
import { TopBar } from "@/components/ui/TopBar";

export default function CreateCommunityPage() {
  return (
    <main>
      <TopBar
        title="Create Community"
        subtitle="Set up a new student community space"
        backHref="/connect/communities"
      />
      <EmptyState
        title="Community creation is not enabled yet"
        description="Create-community management is outside the current MVP and will be added next."
        actionLabel="Back to communities"
        actionHref="/connect/communities"
      />
    </main>
  );
}
