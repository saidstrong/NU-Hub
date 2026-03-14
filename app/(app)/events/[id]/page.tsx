import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { FeedbackBanner } from "@/components/ui/FeedbackBanner";
import { SectionCard } from "@/components/ui/SectionCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ShellButton } from "@/components/ui/ShellButton";
import { TagChip } from "@/components/ui/TagChip";
import { notFound } from "next/navigation";
import {
  clearEventParticipationAction,
  setEventParticipationAction,
  toggleSavedEventAction,
} from "@/lib/events/actions";
import { reportContentAction } from "@/lib/moderation/actions";
import {
  formatEventDate,
  getEventDetail,
} from "@/lib/events/data";
import { toPublicStorageUrl } from "@/lib/validation/media";
import { isUuid } from "@/lib/validation/uuid";

type EventDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ message?: string; error?: string }>;
};

export default async function EventDetailPage({ params, searchParams }: EventDetailPageProps) {
  const { message, error } = await searchParams;
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
        <section className="wire-panel">
          <SectionHeader
            title="Event"
            subtitle="Schedule, location, and participation details."
            actionNode={
              <Link href="/events" className="wire-link">
                Back to events
              </Link>
            }
          />
        </section>
        {loadError ? <FeedbackBanner tone="error" message={loadError} /> : null}
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
      <section className="wire-panel">
        <SectionHeader
          title="Event"
          subtitle="Schedule, location, and participation details."
          actionNode={
            <Link href="/events" className="wire-link">
              Back to events
            </Link>
          }
        />
        <h2 className="text-[28px] font-semibold leading-[34px] tracking-tight text-wire-100">{event.title}</h2>
        <p className="mt-2 wire-meta">{dateLabel}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <TagChip label={event.category} active />
          <TagChip label="Campus" tone="status" />
          <TagChip label={isDraft ? "Draft" : "Published"} tone="status" />
        </div>
      </section>
      {message ? <FeedbackBanner tone="success" message={message} /> : null}
      {error ? <FeedbackBanner tone="error" message={error} /> : null}
      {isDraft && isOwner ? (
        <FeedbackBanner
          tone="warning"
          message="This event is currently a draft and visible only to you."
        />
      ) : null}

      {coverUrl ? (
        <SectionCard title="Cover" subtitle="Visual context for this event.">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coverUrl}
            alt={event.title}
            className="h-48 w-full rounded-[var(--radius-input)] border border-wire-700 bg-wire-900 object-cover"
          />
        </SectionCard>
      ) : (
        <div className="wire-placeholder h-40" />
      )}

      <SectionCard
        title="Event summary"
        subtitle="Core details for attendance planning."
      >
        <div className="space-y-2">
          <p className="wire-meta">Date / Time: {dateLabel}</p>
          <p className="wire-meta">Location: {event.location}</p>
          <p className="wire-meta">Organizer: {organizerLabel}</p>
          {organizerMeta ? <p className="wire-meta">Context: {organizerMeta}</p> : null}
        </div>
      </SectionCard>

      <SectionCard
        title="Description"
        subtitle="Additional context from the organizer."
      >
        <p className="text-[14px] leading-relaxed text-wire-200">
          {event.description || "No additional event description provided."}
        </p>
      </SectionCard>

      {!isDraft ? (
        <>
          <SectionCard
            title="RSVP"
            subtitle="Set intent and track participation signals."
          >
            <div className="mb-3 space-y-1">
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

            <div className="wire-action-row">
              <form action={setEventParticipationAction} className="w-full">
                <input type="hidden" name="eventId" value={event.id} />
                <input type="hidden" name="status" value="going" />
                <input type="hidden" name="redirectTo" value={`/events/${event.id}`} />
                <button type="submit" className={goingActive ? "wire-action-primary w-full" : "wire-action w-full"}>
                  {goingActive ? "Going" : "Mark going"}
                </button>
              </form>
              <form action={setEventParticipationAction} className="w-full">
                <input type="hidden" name="eventId" value={event.id} />
                <input type="hidden" name="status" value="interested" />
                <input type="hidden" name="redirectTo" value={`/events/${event.id}`} />
                <button type="submit" className={interestedActive ? "wire-action-primary w-full" : "wire-action w-full"}>
                  {interestedActive ? "Interested" : "Mark interested"}
                </button>
              </form>
            </div>

            {isOwner ? (
              <div className="mt-3">
                <ShellButton label="Edit event" href={`/events/${event.id}/edit`} variant="primary" />
              </div>
            ) : null}

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <form action={toggleSavedEventAction} className="w-full">
                <input type="hidden" name="eventId" value={event.id} />
                <input type="hidden" name="redirectTo" value={`/events/${event.id}`} />
                <button type="submit" className="wire-action w-full">
                  {isSaved ? "Unsave event" : "Save event"}
                </button>
              </form>
              <form action={clearEventParticipationAction} className="w-full">
                <input type="hidden" name="eventId" value={event.id} />
                <input type="hidden" name="redirectTo" value={`/events/${event.id}`} />
                <button type="submit" className="wire-action w-full">
                  Clear RSVP
                </button>
              </form>
            </div>
            {!isOwner ? (
              <div className="mt-3">
                <form action={reportContentAction}>
                  <input type="hidden" name="targetType" value="event" />
                  <input type="hidden" name="targetId" value={event.id} />
                  <input type="hidden" name="reason" value="inappropriate" />
                  <input type="hidden" name="redirectTo" value={`/events/${event.id}`} />
                  <button type="submit" className="wire-action-ghost">
                    Report event
                  </button>
                </form>
              </div>
            ) : null}
          </SectionCard>
        </>
      ) : null}
    </main>
  );
}
