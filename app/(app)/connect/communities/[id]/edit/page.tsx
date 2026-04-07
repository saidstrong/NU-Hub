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
          subtitle="Keep this community's purpose and join access clear"
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
        subtitle="Keep this community's purpose and join access clear"
        backHref={`/connect/communities/${community.id}`}
      />
      {error ? (
        <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-[13px] text-red-200">
          {error}
        </div>
      ) : null}

      <section className="wire-panel py-3">
        <p className="wire-label">Community maintenance</p>
        <p className="mt-1 text-[13px] leading-relaxed text-wire-300">
          Keep the name, purpose, and join access aligned with how the community actually runs so
          students know what to expect before they join and follow updates.
        </p>
      </section>

      <form action={updateCommunityAction} className="flex flex-col gap-5" encType="multipart/form-data">
        <input type="hidden" name="communityId" value={community.id} />

        <FormSection title="Avatar (optional)" description="Update the visual identity students see for this community.">
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

        <FormSection title="Community name" description="Keep the name students already recognize on campus.">
          <WireField
            label="Name"
            name="name"
            required
            placeholder="NU Product Circle"
            defaultValue={community.name}
          />
        </FormSection>

        <FormSection title="Purpose" description="Keep the purpose, audience, and member expectations clear.">
          <WireTextarea
            label="Purpose"
            name="description"
            rows={6}
            placeholder="A student group for product thinking, peer critique, and practical workshops for NU builders."
            defaultValue={community.description}
          />
        </FormSection>

        <FormSection title="Category" description="Helps students understand what kind of community this is.">
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

        <FormSection title="Focus tags" description="Optional short tags that help students scan the community quickly.">
          <WireField
            label="Tags"
            name="tagsInput"
            placeholder="Product, Startups, Design"
            defaultValue={tagsDefault}
          />
        </FormSection>

        <FormSection title="Join access" description="Keep this aligned with how you review members and run the community.">
          <label className="block space-y-2">
            <span className="wire-label">Join type</span>
            <select
              name="joinType"
              required
              className="wire-input-field"
              defaultValue={community.join_type}
            >
              <option value="open">Open (students join immediately)</option>
              <option value="request">Request (owner review before joining)</option>
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
          This permanently removes the community, member access, and pending join requests.
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
