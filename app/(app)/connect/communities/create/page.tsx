import { FormSection } from "@/components/ui/FormSection";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { TopBar } from "@/components/ui/TopBar";
import { WireField, WireTextarea } from "@/components/ui/WireField";
import { createCommunityAction } from "@/lib/connect/actions";

type CreateCommunityPageProps = {
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

export default async function CreateCommunityPage({
  searchParams,
}: CreateCommunityPageProps) {
  const { error } = await searchParams;

  return (
    <main>
      <TopBar
        title="Create Community"
        subtitle="Set up a new student community space"
        backHref="/connect/communities"
      />
      {error ? (
        <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-[13px] text-red-200">
          {error}
        </div>
      ) : null}

      <form action={createCommunityAction} className="flex flex-col gap-5">
        <FormSection title="Community name">
          <WireField
            label="Name"
            name="name"
            required
            placeholder="NU Product Circle"
          />
        </FormSection>

        <FormSection title="Description" description="Share the community purpose and what members can do here.">
          <WireTextarea
            label="Description"
            name="description"
            rows={6}
            placeholder="A student community for product thinking, startup practice, and peer feedback."
          />
        </FormSection>

        <FormSection title="Category">
          <label className="block space-y-2">
            <span className="wire-label">Category (optional)</span>
            <select name="category" className="wire-input-field">
              <option value="">No category</option>
              {categoryOptions.map((category) => (
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
          />
        </FormSection>

        <FormSection title="Join access">
          <label className="block space-y-2">
            <span className="wire-label">Join type</span>
            <select name="joinType" required className="wire-input-field">
              <option value="open">Open (any student can join)</option>
              <option value="request">Request (owner approval required)</option>
            </select>
          </label>
        </FormSection>

        <div className="wire-action-row-single">
          <SubmitButton
            label="Create community"
            pendingLabel="Creating..."
            variant="primary"
          />
        </div>
      </form>
    </main>
  );
}
