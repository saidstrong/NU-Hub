import { FormSection } from "@/components/ui/FormSection";
import { DirectListingImageUpload } from "@/components/ui/DirectListingImageUpload";
import { ListingTypePricingFields } from "@/components/ui/ListingTypePricingFields";
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
        title="Create listing"
        subtitle="Create a sale, rental, or service listing other NU students can trust and act on."
        backHref="/market"
      />
      {error ? (
        <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-[13px] text-red-200">
          {error}
        </div>
      ) : null}

      <section className="wire-panel py-3">
        <p className="wire-label">Listing setup</p>
        <p className="mt-1 text-[13px] leading-relaxed text-wire-300">
          Be clear about what you are offering, what shape it is in, what it costs, and where another student can meet you on campus.
        </p>
      </section>

      <form action={publishListingAction} className="flex flex-col gap-5">
        <section className="wire-panel">
          <h3 className="mb-2 text-sm font-semibold text-wire-100">Listing photos</h3>
          <p className="mb-3 wire-meta">
            Use clear photos of the actual item, or relevant service context, so students can judge what is being offered quickly.
          </p>
          <DirectListingImageUpload />
        </section>

        <FormSection
          title="Item title"
          description="Use the name students will recognize in market browse, saved listings, and messages."
        >
          <WireField label="Title" name="title" required />
        </FormSection>

        <FormSection
          title="Listing format"
          description="Match the listing type and pricing model to how this will actually be exchanged."
        >
          <ListingTypePricingFields initialListingType="sale" initialPricingModel="fixed" />
          <p className="wire-meta">
            Sale uses Fixed. Rentals use Per day/Per week/Per month. Services use Fixed/Per hour/Starting from.
          </p>
        </FormSection>

        <FormSection
          title="Category"
          description="Helps students understand what kind of listing this is before they open it."
        >
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
        <FormSection
          title="Price"
          description="Use the amount or starting rate another student should expect."
        >
          <WireField
            label="Enter price / rate (KZT)"
            name="priceKzt"
            type="number"
            required
            placeholder="8500"
          />
        </FormSection>
        <FormSection
          title="Condition and quality"
          description="Set expectations honestly so buyers know what they are getting before they message you."
        >
          <label className="block space-y-2">
            <span className="wire-label">Condition or quality</span>
            <select name="condition" required className="wire-input-field">
              {conditionOptions.map((condition) => (
                <option key={condition} value={condition}>
                  {condition}
                </option>
              ))}
            </select>
          </label>
        </FormSection>
        <FormSection
          title="Description"
          description="Include the details another student needs before asking about the listing."
        >
          <WireTextarea label="Describe item" name="description" rows={5} />
        </FormSection>
        <FormSection
          title="Pickup and handoff"
          description="Be specific about where on campus you can meet or hand over the item."
        >
          <WireField label="Location details" name="pickupLocation" required />
        </FormSection>

        <div className="wire-action-row">
          <button type="submit" formAction={saveDraftListingAction} className="wire-action">
            Save draft
          </button>
          <SubmitButton label="Publish listing" pendingLabel="Publishing..." variant="primary" />
        </div>
      </form>
    </main>
  );
}
