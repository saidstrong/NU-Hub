import { EmptyState } from "@/components/ui/EmptyState";
import { TagChip } from "@/components/ui/TagChip";
import { TopBar } from "@/components/ui/TopBar";
import { notFound } from "next/navigation";
import {
  clearEventParticipationAction,
  setEventParticipationAction,
  toggleSavedEventAction,
} from "@/lib/events/actions";
import {
  formatEventDate,
  getEventDetail,
} from "@/lib/events/data";
import { toPublicStorageUrl } from "@/lib/validation/media";
import { isUuid } from "@/lib/validation/uuid";

type EventDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ message?: string }>;
};

export default async function EventDetailPage({ params, searchParams }: EventDetailPageProps) {
  const { message } = await searchParams;
  const { id } = await params;

  if (!isUuid(id)) {
    notFound();
  }

  let detail: Awaited<ReturnType<typeof getEventDetail>> | null = null;
  let loadError: string | null = null;

  try {
    detail = await getEventDetail(id);
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Failed to load event.";
  }

  if (!detail || !detail.event) {
    return (
      <main>
        <TopBar
          title="Event"
          subtitle="Schedule, location, and participation details"
          backHref="/events"
        />
        {loadError ? (
          <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-[13px] text-red-200">
            {loadError}
          </div>
        ) : null}
        <EmptyState
          title="Event not available"
          description="This event may have been removed or is not published."
          actionLabel="Back to events"
          actionHref="/events"
        />
      </main>
    );
  }

  const { event, organizer, isOwner, isSaved, participationStatus, rsvpCounts } = detail;
  const isDraft = !event.is_published;
  const dateLabel = formatEventDate(event.starts_at, event.ends_at);
  const organizerLabel = organizer?.full_name || "NU Atrium editorial team";
  const interestedActive = participationStatus === "interested";
  const goingActive = participationStatus === "going";
  const organizerMeta = [organizer?.school, organizer?.major, organizer?.year_label]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(" - ");
  const coverUrl = toPublicStorageUrl("event-images", event.cover_path);

  return (
    <main>
      <TopBar
        title="Event"
        subtitle="Schedule, location, and participation details"
        backHref="/events"
        actions={isOwner ? [{ label: "Edit Event", href: `/events/${event.id}/edit` }] : []}
      />
      {message ? (
        <div className="rounded-xl border border-accent/35 bg-accent/10 px-3 py-2 text-[13px] text-wire-100">
          {message}
        </div>
      ) : null}
      {isDraft && isOwner ? (
        <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-[13px] text-amber-100">
          This event is currently a draft and visible only to you.
        </div>
      ) : null}

      {coverUrl ? (
        <section className="wire-panel">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coverUrl}
            alt={event.title}
            className="h-44 w-full rounded-xl border border-wire-700 bg-wire-900 object-cover"
          />
        </section>
      ) : (
        <div className="wire-placeholder h-40" />
      )}

      <section className="wire-panel">
        <h2 className="text-[18px] font-semibold tracking-tight text-wire-100">{event.title}</h2>
        <div className="mt-3 space-y-1">
          <p className="wire-meta">Date / Time: {dateLabel}</p>
          <p className="wire-meta">Location: {event.location}</p>
          <p className="wire-meta">Organizer: {organizerLabel}</p>
          {organizerMeta ? <p className="wire-meta">Context: {organizerMeta}</p> : null}
        </div>
      </section>

      <section className="wire-panel">
        <h3 className="mb-2 text-sm font-semibold text-wire-100">Description</h3>
        <p className="text-[13px] leading-relaxed text-wire-200">
          {event.description || "No additional event description provided."}
        </p>
      </section>

      <section className="wire-panel">
        <h3 className="mb-2 text-sm font-semibold text-wire-100">Tags</h3>
        <div className="flex flex-wrap gap-2">
          <TagChip label={event.category} active />
          <TagChip label="Campus" />
          {isDraft ? <TagChip label="Draft" /> : <TagChip label="Curated" />}
        </div>
      </section>

      {!isDraft ? (
        <>
          <section className="wire-panel">
            <h3 className="mb-2 text-sm font-semibold text-wire-100">RSVP</h3>
            <div className="mb-2 space-y-1">
              <p className="wire-meta">Going: {rsvpCounts.going}</p>
              <p className="wire-meta">Interested: {rsvpCounts.interested}</p>
              <p className="wire-meta">
                Your RSVP:{" "}
                {participationStatus === "going"
                  ? "Going"
                  : participationStatus === "interested"
                    ? "Interested"
                    : "Not set"}
              </p>
            </div>
          </section>

          <div className="wire-action-row">
            <form action={setEventParticipationAction} className="w-full">
              <input type="hidden" name="eventId" value={event.id} />
              <input type="hidden" name="status" value="interested" />
              <input type="hidden" name="redirectTo" value={`/events/${event.id}`} />
              <button type="submit" className={interestedActive ? "wire-action-primary w-full" : "wire-action w-full"}>
                {interestedActive ? "Interested" : "Mark interested"}
              </button>
            </form>
            <form action={setEventParticipationAction} className="w-full">
              <input type="hidden" name="eventId" value={event.id} />
              <input type="hidden" name="status" value="going" />
              <input type="hidden" name="redirectTo" value={`/events/${event.id}`} />
              <button type="submit" className={goingActive ? "wire-action-primary w-full" : "wire-action w-full"}>
                {goingActive ? "Going" : "Mark going"}
              </button>
            </form>
          </div>

          <div className="wire-action-row-single">
            <form action={clearEventParticipationAction}>
              <input type="hidden" name="eventId" value={event.id} />
              <input type="hidden" name="redirectTo" value={`/events/${event.id}`} />
              <button type="submit" className="wire-action w-full">
                Clear RSVP
              </button>
            </form>
          </div>

          <div className="wire-action-row-single">
            <form action={toggleSavedEventAction}>
              <input type="hidden" name="eventId" value={event.id} />
              <input type="hidden" name="redirectTo" value={`/events/${event.id}`} />
              <button type="submit" className="wire-action w-full">
                {isSaved ? "Unsave event" : "Save event"}
              </button>
            </form>
          </div>
        </>
      ) : null}
    </main>
  );
}
