import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmSubmitButton } from "@/components/ui/ConfirmSubmitButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { FormSection } from "@/components/ui/FormSection";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { TopBar } from "@/components/ui/TopBar";
import { WireField, WireTextarea } from "@/components/ui/WireField";
import { deleteCommunityAction, updateCommunityAction } from "@/lib/connect/actions";
import { getOwnedCommunityForEdit } from "@/lib/connect/data";
import { isUuid } from "@/lib/validation/uuid";

type EditCommunityPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    error?: string;
  }>;
};

const categoryOptions = [
  "Academic",
  "Project",
  "Career",
  "Social",
  "Sports",
  "Arts",
  "Volunteering",
];

export default async function EditCommunityPage({ params, searchParams }: EditCommunityPageProps) {
  const [{ id }, { error }] = await Promise.all([params, searchParams]);

  if (!isUuid(id)) {
    notFound();
  }

  let community: Awaited<ReturnType<typeof getOwnedCommunityForEdit>> = null;
  let loadError: string | null = null;

  try {
    community = await getOwnedCommunityForEdit(id);
  } catch (loadCommunityError) {
    loadError = loadCommunityError instanceof Error ? loadCommunityError.message : "Failed to load community.";
  }

  if (loadError) {
    return (
      <main>
        <TopBar
          title="Edit Community"
          subtitle="Update the core settings for your community"
          backHref={`/connect/communities/${id}`}
        />
        <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-[13px] text-red-200">
          {loadError}
        </div>
        <EmptyState
          title="Unable to load community"
          description="Please return to the community page and try again."
          actionLabel="Back to community"
          actionHref={`/connect/communities/${id}`}
        />
      </main>
    );
  }

  if (!community) {
    notFound();
  }

  const categorySelectOptions = community.category && !categoryOptions.includes(community.category)
    ? [community.category, ...categoryOptions]
    : categoryOptions;
  const tagsDefault = community.tags.join(", ");

  return (
    <main>
      <TopBar
        title="Edit Community"
        subtitle="Update the core settings for your community"
        backHref={`/connect/communities/${community.id}`}
      />
      {error ? (
        <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-[13px] text-red-200">
          {error}
        </div>
      ) : null}

      <form action={updateCommunityAction} className="flex flex-col gap-5" encType="multipart/form-data">
        <input type="hidden" name="communityId" value={community.id} />

        <FormSection title="Avatar (optional)">
          <label className="block space-y-2">
            <span className="wire-label">Replace community avatar</span>
            <input
              name="avatar"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="wire-input-field py-2.5"
            />
          </label>
          <p className="wire-meta">Leave empty to keep the current avatar. Max 5MB.</p>
        </FormSection>

        <FormSection title="Community name">
          <WireField
            label="Name"
            name="name"
            required
            placeholder="NU Product Circle"
            defaultValue={community.name}
          />
        </FormSection>

        <FormSection title="Description" description="Share the community purpose and what members can do here.">
          <WireTextarea
            label="Description"
            name="description"
            rows={6}
            placeholder="A student community for product thinking, startup practice, and peer feedback."
            defaultValue={community.description}
          />
        </FormSection>

        <FormSection title="Category">
          <label className="block space-y-2">
            <span className="wire-label">Category (optional)</span>
            <select name="category" className="wire-input-field" defaultValue={community.category ?? ""}>
              <option value="">No category</option>
              {categorySelectOptions.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
        </FormSection>

        <FormSection title="Tags" description="Optional comma-separated tags.">
          <WireField
            label="Tags"
            name="tagsInput"
            placeholder="Product, Startups, Design"
            defaultValue={tagsDefault}
          />
        </FormSection>

        <FormSection title="Join access">
          <label className="block space-y-2">
            <span className="wire-label">Join type</span>
            <select
              name="joinType"
              required
              className="wire-input-field"
              defaultValue={community.join_type}
            >
              <option value="open">Open (any student can join)</option>
              <option value="request">Request (owner approval required)</option>
            </select>
          </label>
        </FormSection>

        <div className="wire-action-row">
          <Link href={`/connect/communities/${community.id}`} className="wire-action">
            Cancel
          </Link>
          <SubmitButton
            label="Save changes"
            pendingLabel="Saving..."
            variant="primary"
          />
        </div>
      </form>

      <section className="wire-panel">
        <h2 className="text-[16px] font-semibold tracking-tight text-wire-100">Delete community</h2>
        <p className="mt-1 wire-meta">
          This permanently removes the community, memberships, and pending requests.
        </p>
        <form action={deleteCommunityAction} className="mt-3">
          <input type="hidden" name="communityId" value={community.id} />
          <ConfirmSubmitButton
            label="Delete community"
            pendingLabel="Deleting..."
            confirmMessage="Delete this community permanently?"
            className="border-red-400/40 text-red-200 hover:border-red-400/70 hover:bg-red-500/10"
          />
        </form>
      </section>
    </main>
  );
}
