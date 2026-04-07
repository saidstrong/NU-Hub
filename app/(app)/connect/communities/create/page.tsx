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
        subtitle="Start a campus group with a clear purpose and join model"
        backHref="/connect/communities"
      />
      {error ? (
        <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-[13px] text-red-200">
          {error}
        </div>
      ) : null}

      <section className="wire-panel py-3">
        <p className="wire-label">Community setup</p>
        <p className="mt-1 text-[13px] leading-relaxed text-wire-300">
          Use a clear name, explain what the group does and who it is for, and choose whether
          students join immediately or by request.
        </p>
      </section>

      <form action={createCommunityAction} className="flex flex-col gap-5" encType="multipart/form-data">
        <FormSection title="Avatar (optional)" description="Optional visual identity for the group.">
          <label className="block space-y-2">
            <span className="wire-label">Community avatar</span>
            <input
              name="avatar"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="wire-input-field py-2.5"
            />
          </label>
          <p className="wire-meta">JPEG, PNG, WEBP. Max 5MB.</p>
        </FormSection>

        <FormSection title="Community name" description="Use the name students already recognize on campus.">
          <WireField
            label="Name"
            name="name"
            required
            placeholder="NU Product Circle"
          />
        </FormSection>

        <FormSection title="Purpose" description="Explain what the community does, who it is for, and how members take part.">
          <WireTextarea
            label="Purpose"
            name="description"
            rows={6}
            placeholder="A student group for product thinking, peer critique, and practical workshops for NU builders."
          />
        </FormSection>

        <FormSection title="Category" description="Helps students understand what kind of community this is.">
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

        <FormSection title="Focus tags" description="Optional short tags that help students scan the community quickly.">
          <WireField
            label="Tags"
            name="tagsInput"
            placeholder="Product, Startups, Design"
          />
        </FormSection>

        <FormSection title="Join access" description="Choose whether students join right away or wait for owner review.">
          <label className="block space-y-2">
            <span className="wire-label">Join type</span>
            <select name="joinType" required className="wire-input-field">
              <option value="open">Open (students join immediately)</option>
              <option value="request">Request (owner review before joining)</option>
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
