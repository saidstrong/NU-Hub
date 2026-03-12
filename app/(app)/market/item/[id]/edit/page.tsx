import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmSubmitButton } from "@/components/ui/ConfirmSubmitButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { FormSection } from "@/components/ui/FormSection";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { TopBar } from "@/components/ui/TopBar";
import { WireField, WireTextarea } from "@/components/ui/WireField";
import { deleteListingAction, updateListingAction } from "@/lib/market/actions";
import {
  formatStatusLabel,
  getOwnedListingForEdit,
  type ListingStatus,
} from "@/lib/market/data";
import { marketCategories } from "@/lib/mock-data";
import { isUuid } from "@/lib/validation/uuid";

type EditListingPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    error?: string;
  }>;
};

const conditionOptions = ["New", "Like new", "Good", "Used"];
const editableStatusOptions = ["draft", "active", "reserved", "sold"] as const;

export default async function EditListingPage({ params, searchParams }: EditListingPageProps) {
  const [{ id }, { error }] = await Promise.all([params, searchParams]);

  if (!isUuid(id)) {
    notFound();
  }

  let listing: Awaited<ReturnType<typeof getOwnedListingForEdit>> = null;
  let loadError: string | null = null;

  try {
    listing = await getOwnedListingForEdit(id);
  } catch (loadListingError) {
    loadError = loadListingError instanceof Error ? loadListingError.message : "Failed to load listing.";
  }

  if (loadError) {
    return (
      <main>
        <TopBar
          title="Edit Listing"
          subtitle="Update details for your marketplace post"
          backHref={`/market/item/${id}`}
        />
        <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-[13px] text-red-200">
          {loadError}
        </div>
        <EmptyState
          title="Unable to load listing"
          description="Please return to the listing page and try again."
          actionLabel="Back to listing"
          actionHref={`/market/item/${id}`}
        />
      </main>
    );
  }

  if (!listing) {
    notFound();
  }

  const categoryOptions = marketCategories.includes(listing.category)
    ? marketCategories
    : [listing.category, ...marketCategories];
  const listingConditionOptions = conditionOptions.includes(listing.condition)
    ? conditionOptions
    : [listing.condition, ...conditionOptions];
  const statusOptions: ListingStatus[] = (
    editableStatusOptions as readonly ListingStatus[]
  ).includes(listing.status)
    ? [...editableStatusOptions]
    : [listing.status, ...editableStatusOptions];

  return (
    <main>
      <TopBar
        title="Edit Listing"
        subtitle="Update details for your marketplace post"
        backHref={`/market/item/${listing.id}`}
      />
      {error ? (
        <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-[13px] text-red-200">
          {error}
        </div>
      ) : null}

      <form action={updateListingAction} className="flex flex-col gap-5">
        <input type="hidden" name="listingId" value={listing.id} />

        <FormSection title="Item title">
          <WireField label="Title" name="title" required defaultValue={listing.title} />
        </FormSection>

        <FormSection title="Category">
          <label className="block space-y-2">
            <span className="wire-label">Select category</span>
            <select name="category" required className="wire-input-field" defaultValue={listing.category}>
              {categoryOptions.map((category) => (
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
            defaultValue={String(listing.price_kzt)}
          />
        </FormSection>

        <FormSection title="Condition">
          <label className="block space-y-2">
            <span className="wire-label">Condition</span>
            <select
              name="condition"
              required
              className="wire-input-field"
              defaultValue={listing.condition}
            >
              {listingConditionOptions.map((condition) => (
                <option key={condition} value={condition}>
                  {condition}
                </option>
              ))}
            </select>
          </label>
        </FormSection>

        <FormSection title="Description">
          <WireTextarea label="Describe item" name="description" rows={5} defaultValue={listing.description} />
        </FormSection>

        <FormSection title="Pickup">
          <WireField
            label="Pickup details"
            name="pickupLocation"
            required
            defaultValue={listing.pickup_location}
          />
        </FormSection>

        <FormSection title="Status">
          <label className="block space-y-2">
            <span className="wire-label">Listing status</span>
            <select name="status" required className="wire-input-field" defaultValue={listing.status}>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {formatStatusLabel(status)}
                </option>
              ))}
            </select>
          </label>
        </FormSection>

        <div className="wire-action-row">
          <Link href={`/market/item/${listing.id}`} className="wire-action">
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
        <h2 className="text-[16px] font-semibold tracking-tight text-wire-100">Delete listing</h2>
        <p className="mt-1 wire-meta">
          This permanently removes the listing and its related saved records.
        </p>
        <form action={deleteListingAction} className="mt-3">
          <input type="hidden" name="listingId" value={listing.id} />
          <ConfirmSubmitButton
            label="Delete listing"
            pendingLabel="Deleting..."
            confirmMessage="Delete this listing permanently?"
            className="border-red-400/40 text-red-200 hover:border-red-400/70 hover:bg-red-500/10"
          />
        </form>
      </section>
    </main>
  );
}
