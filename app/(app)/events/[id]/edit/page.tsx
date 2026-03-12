import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmSubmitButton } from "@/components/ui/ConfirmSubmitButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { FormSection } from "@/components/ui/FormSection";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { TopBar } from "@/components/ui/TopBar";
import { WireField, WireTextarea } from "@/components/ui/WireField";
import { deleteEventAction, updateEventAction } from "@/lib/events/actions";
import { getOwnedEventForEdit } from "@/lib/events/data";
import { eventCategories } from "@/lib/mock-data";
import { utcIsoToNuLocalDateTimeInput } from "@/lib/validation/events";
import { isUuid } from "@/lib/validation/uuid";

type EditEventPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function EditEventPage({ params, searchParams }: EditEventPageProps) {
  const [{ id }, { error }] = await Promise.all([params, searchParams]);

  if (!isUuid(id)) {
    notFound();
  }

  let event: Awaited<ReturnType<typeof getOwnedEventForEdit>> = null;
  let loadError: string | null = null;

  try {
    event = await getOwnedEventForEdit(id);
  } catch (loadEventError) {
    loadError = loadEventError instanceof Error ? loadEventError.message : "Failed to load event.";
  }

  if (loadError) {
    return (
      <main>
        <TopBar
          title="Edit Event"
          subtitle="Update title, schedule, and visibility settings"
          backHref={`/events/${id}`}
        />
        <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-[13px] text-red-200">
          {loadError}
        </div>
        <EmptyState
          title="Unable to load event"
          description="Please return to the event page and try again."
          actionLabel="Back to event"
          actionHref={`/events/${id}`}
        />
      </main>
    );
  }

  if (!event) {
    notFound();
  }

  const startsAtInput = utcIsoToNuLocalDateTimeInput(event.starts_at) ?? "";
  const endsAtInput = event.ends_at ? utcIsoToNuLocalDateTimeInput(event.ends_at) ?? "" : "";
  const publishState = event.is_published ? "true" : "false";
  const categoryOptions = eventCategories.includes(event.category)
    ? eventCategories
    : [event.category, ...eventCategories];

  return (
    <main>
      <TopBar
        title="Edit Event"
        subtitle="Update title, schedule, and visibility settings"
        backHref={`/events/${event.id}`}
      />
      {error ? (
        <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-[13px] text-red-200">
          {error}
        </div>
      ) : null}

      <form action={updateEventAction} className="flex flex-col gap-5">
        <input type="hidden" name="eventId" value={event.id} />

        <FormSection title="Event title">
          <WireField
            label="Title"
            name="title"
            required
            placeholder="NU Product Meetup"
            defaultValue={event.title}
          />
        </FormSection>

        <FormSection title="Description" description="Optional context for attendees.">
          <WireTextarea
            label="Description"
            name="description"
            rows={6}
            placeholder="A student-led session for product strategy and project demos."
            defaultValue={event.description}
          />
        </FormSection>

        <FormSection title="Category">
          <label className="block space-y-2">
            <span className="wire-label">Select category</span>
            <select
              name="category"
              required
              className="wire-input-field"
              defaultValue={event.category}
            >
              {categoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
        </FormSection>

        <FormSection title="Schedule">
          <WireField
            label="Starts at"
            name="startsAtInput"
            type="datetime-local"
            required
            defaultValue={startsAtInput}
          />
          <WireField
            label="Ends at (optional)"
            name="endsAtInput"
            type="datetime-local"
            defaultValue={endsAtInput}
          />
        </FormSection>

        <FormSection title="Location">
          <WireField
            label="Venue"
            name="location"
            required
            placeholder="C3.200 Auditorium"
            defaultValue={event.location}
          />
        </FormSection>

        <FormSection title="Visibility">
          <label className="block space-y-2">
            <span className="wire-label">Publish state</span>
            <select
              name="isPublishedInput"
              required
              className="wire-input-field"
              defaultValue={publishState}
            >
              <option value="true">Published</option>
              <option value="false">Draft</option>
            </select>
          </label>
        </FormSection>

        <div className="wire-action-row">
          <Link href={`/events/${event.id}`} className="wire-action">
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
        <h2 className="text-[16px] font-semibold tracking-tight text-wire-100">Delete event</h2>
        <p className="mt-1 wire-meta">
          This permanently removes the event and related participation/saved records.
        </p>
        <form action={deleteEventAction} className="mt-3">
          <input type="hidden" name="eventId" value={event.id} />
          <ConfirmSubmitButton
            label="Delete event"
            pendingLabel="Deleting..."
            confirmMessage="Delete this event permanently?"
            className="border-red-400/40 text-red-200 hover:border-red-400/70 hover:bg-red-500/10"
          />
        </form>
      </section>
    </main>
  );
}
