import { FormSection } from "@/components/ui/FormSection";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { TopBar } from "@/components/ui/TopBar";
import { WireField, WireTextarea } from "@/components/ui/WireField";
import { createEventAction } from "@/lib/events/actions";
import { eventCategories } from "@/lib/mock-data";

type CreateEventPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function CreateEventPage({ searchParams }: CreateEventPageProps) {
  const { error } = await searchParams;

  return (
    <main>
      <TopBar
        title="Create Event"
        subtitle="Submit a campus event for moderation review"
        backHref="/events"
      />
      {error ? (
        <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-[13px] text-red-200">
          {error}
        </div>
      ) : null}

      <form action={createEventAction} className="flex flex-col gap-5" encType="multipart/form-data">
        <FormSection title="Cover image (optional)">
          <label className="block space-y-2">
            <span className="wire-label">Event cover</span>
            <input
              name="coverImage"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="wire-input-field py-2.5"
            />
          </label>
          <p className="wire-meta">JPEG, PNG, WEBP. Max 10MB.</p>
        </FormSection>

        <FormSection title="Event title">
          <WireField
            label="Title"
            name="title"
            required
            placeholder="NU Product Meetup"
          />
        </FormSection>

        <FormSection title="Description" description="Optional context for attendees.">
          <WireTextarea
            label="Description"
            name="description"
            rows={6}
            placeholder="A student-led session for product strategy and project demos."
          />
        </FormSection>

        <FormSection title="Category">
          <label className="block space-y-2">
            <span className="wire-label">Select category</span>
            <select name="category" required className="wire-input-field">
              {eventCategories.map((category) => (
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
          />
          <WireField
            label="Ends at (optional)"
            name="endsAtInput"
            type="datetime-local"
          />
        </FormSection>

        <FormSection title="Location">
          <WireField
            label="Venue"
            name="location"
            required
            placeholder="C3.200 Auditorium"
          />
        </FormSection>

        <input type="hidden" name="isPublishedInput" value="false" />

        <div className="wire-action-row-single">
          <SubmitButton
            label="Submit event"
            pendingLabel="Creating..."
            variant="primary"
          />
        </div>
      </form>
    </main>
  );
}
