import { FormSection } from "@/components/ui/FormSection";
import { DirectListingImageUpload } from "@/components/ui/DirectListingImageUpload";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { TopBar } from "@/components/ui/TopBar";
import { WireField, WireTextarea } from "@/components/ui/WireField";
import { saveDraftListingAction, publishListingAction } from "@/lib/market/actions";
import { formatListingTypeLabel, formatPricingModelLabel } from "@/lib/market/data";
import { marketCategories } from "@/lib/mock-data";
import {
  LISTING_TYPE_VALUES,
  PRICING_MODEL_VALUES,
} from "@/lib/validation/market";

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
        title="Post listing"
        subtitle="Create a marketplace sale, rental, or service listing"
        backHref="/market"
      />
      {error ? (
        <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-[13px] text-red-200">
          {error}
        </div>
      ) : null}

      <form action={publishListingAction} className="flex flex-col gap-5">
        <section className="wire-panel">
          <h3 className="mb-2 text-sm font-semibold text-wire-100">Upload images</h3>
          <DirectListingImageUpload />
        </section>

        <FormSection title="Item title">
          <WireField label="Title" name="title" required />
        </FormSection>

        <FormSection title="Listing format">
          <label className="block space-y-2">
            <span className="wire-label">Listing type</span>
            <select name="listingType" required className="wire-input-field" defaultValue="sale">
              {LISTING_TYPE_VALUES.map((listingType) => (
                <option key={listingType} value={listingType}>
                  {formatListingTypeLabel(listingType)}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-2">
            <span className="wire-label">Pricing model</span>
            <select name="pricingModel" required className="wire-input-field" defaultValue="fixed">
              {PRICING_MODEL_VALUES.map((pricingModel) => (
                <option key={pricingModel} value={pricingModel}>
                  {formatPricingModelLabel(pricingModel)}
                </option>
              ))}
            </select>
          </label>
          <p className="wire-meta">
            Sale uses Fixed. Rentals use Per day/Per week/Per month. Services use Fixed/Per hour/Starting from.
          </p>
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
            label="Enter price / rate (KZT)"
            name="priceKzt"
            type="number"
            required
            placeholder="8500"
          />
        </FormSection>
        <FormSection title="Condition / quality">
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
        <FormSection title="Description">
          <WireTextarea label="Describe item" name="description" rows={5} />
        </FormSection>
        <FormSection title="Location">
          <WireField label="Location details" name="pickupLocation" required />
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
