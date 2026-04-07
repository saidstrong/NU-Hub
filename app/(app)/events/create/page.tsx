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
        subtitle="Set up a campus event students can understand, join, and track"
        backHref="/events"
      />
      {error ? (
        <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-[13px] text-red-200">
          {error}
        </div>
      ) : null}

      <section className="wire-panel py-3">
        <p className="wire-label">Organizer setup</p>
        <p className="mt-1 text-[13px] leading-relaxed text-wire-300">
          Give students a clear event purpose, accurate timing, and a real location so they know what they are joining before you submit it for review.
        </p>
      </section>

      <form action={createEventAction} className="flex flex-col gap-5" encType="multipart/form-data">
        <FormSection title="Cover image (optional)" description="Optional visual context students see before they open the event.">
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

        <FormSection title="Event title" description="Use the name students will recognize in event lists, saved events, and My Events.">
          <WireField
            label="Title"
            name="title"
            required
            placeholder="NU Product Meetup"
          />
        </FormSection>

        <FormSection title="Purpose and details" description="Explain what the event is for, who it is relevant to, and what students should expect.">
          <WireTextarea
            label="Details"
            name="description"
            rows={6}
            placeholder="A student-led session for product strategy, project demos, and anyone at NU exploring product roles."
          />
        </FormSection>

        <FormSection title="Category" description="Helps students understand what kind of event this is before they open it.">
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

        <FormSection title="Schedule" description="Set the timing students should plan around if they mark Going or Interested.">
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

        <FormSection title="Location" description="Use the place students should actually go or the clearest available meeting point.">
          <WireField
            label="Location"
            name="location"
            required
            placeholder="C3.200 Auditorium"
          />
        </FormSection>

        <input type="hidden" name="isPublishedInput" value="false" />

        <div className="wire-action-row-single">
          <SubmitButton
            label="Submit event"
            pendingLabel="Submitting..."
            variant="primary"
          />
        </div>
      </form>
    </main>
  );
}
