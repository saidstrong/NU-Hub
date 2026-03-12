import { FormSection } from "@/components/ui/FormSection";
import { ImageUploadPreview } from "@/components/ui/ImageUploadPreview";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { TopBar } from "@/components/ui/TopBar";
import { WireField, WireTextarea } from "@/components/ui/WireField";
import { saveDraftListingAction, publishListingAction } from "@/lib/market/actions";
import { marketCategories } from "@/lib/mock-data";

type MarketPostPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

const conditionOptions = ["New", "Like new", "Good", "Used"];

export default async function MarketPostPage({ searchParams }: MarketPostPageProps) {
  const { error } = await searchParams;

  return (
    <main>
      <TopBar
        title="Post Item"
        subtitle="Create a new student marketplace listing"
        backHref="/market"
      />
      {error ? (
        <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-[13px] text-red-200">
          {error}
        </div>
      ) : null}

      <form
        action={publishListingAction}
        className="flex flex-col gap-5"
        encType="multipart/form-data"
      >
        <section className="wire-panel">
          <h3 className="mb-2 text-sm font-semibold text-wire-100">Upload images</h3>
          <ImageUploadPreview
            name="images"
            label="Listing images (optional)"
            helperText="Up to 4 images. JPEG, PNG, WEBP. Upload order sets cover image."
            maxPreviewCount={4}
          />
        </section>

        <FormSection title="Item title">
          <WireField label="Title" name="title" required />
        </FormSection>
        <FormSection title="Category">
          <label className="block space-y-2">
            <span className="wire-label">Select category</span>
            <select name="category" required className="wire-input-field">
              {marketCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
        </FormSection>
        <FormSection title="Price">
          <WireField
            label="Enter price (KZT)"
            name="priceKzt"
            type="number"
            required
            placeholder="8500"
          />
        </FormSection>
        <FormSection title="Condition">
          <label className="block space-y-2">
            <span className="wire-label">Condition</span>
            <select name="condition" required className="wire-input-field">
              {conditionOptions.map((condition) => (
                <option key={condition} value={condition}>
                  {condition}
                </option>
              ))}
            </select>
          </label>
        </FormSection>
        <FormSection title="Description">
          <WireTextarea label="Describe item" name="description" rows={5} />
        </FormSection>
        <FormSection title="Pickup">
          <WireField label="Pickup details" name="pickupLocation" required />
        </FormSection>

        <div className="wire-action-row">
          <button type="submit" formAction={saveDraftListingAction} className="wire-action">
            Save draft
          </button>
          <SubmitButton label="Publish" pendingLabel="Publishing..." variant="primary" />
        </div>
      </form>
    </main>
  );
}
