import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { FeedbackBanner } from "@/components/ui/FeedbackBanner";
import { SectionCard } from "@/components/ui/SectionCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ShellButton } from "@/components/ui/ShellButton";
import { SubmitButton } from "@/components/ui/SubmitButton";
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

function getParticipationStateCopy(status: "going" | "interested" | null): {
  label: string;
  description: string;
} {
  if (status === "going") {
    return {
      label: "Going",
      description: "You plan to attend this event.",
    };
  }

  if (status === "interested") {
    return {
      label: "Interested",
      description: "You want to keep track of this event.",
    };
  }

  return {
    label: "No RSVP yet",
    description: "Choose Going if you plan to attend or Interested if you want to keep track of it.",
  };
}

export default async function EventDetailPage({ params, searchParams }: EventDetailPageProps) {
  const [{ message, error }, { id }] = await Promise.all([searchParams, params]);

  if (!isUuid(id)) {
    notFound();
  }

  let detail: Awaited<ReturnType<typeof getEventDetail>> | null = null;
  let loadError: string | null = null;

  try {
    detail = await getEventDetail(id);
  } catch (loadIssue) {
    loadError = loadIssue instanceof Error ? loadIssue.message : "Failed to load event.";
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
  const isPendingReview = !event.is_published && !event.is_hidden;
  const isRejected = !event.is_published && event.is_hidden;
  const isPublished = event.is_published && !event.is_hidden;
  const statusLabel = isRejected ? "Rejected" : isPendingReview ? "Pending review" : "Published";
  const dateLabel = formatEventDate(event.starts_at, event.ends_at);
  const organizerLabel = organizer?.full_name || "NU event organizer";
  const interestedActive = participationStatus === "interested";
  const goingActive = participationStatus === "going";
  const organizerMeta = [organizer?.school, organizer?.major, organizer?.year_label]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(" - ");
  const organizerContextLabel = organizerMeta || "NU organizer";
  const locationLabel =
    typeof event.location === "string" && event.location.trim().length > 0
      ? event.location.trim()
      : "Location to be confirmed";
  const descriptionLabel =
    typeof event.description === "string" && event.description.trim().length > 0
      ? event.description.trim()
      : "No additional event description provided.";
  const participationState = getParticipationStateCopy(participationStatus);
  const coverUrl = toPublicStorageUrl("event-images", event.cover_path);

  return (
    <main>
      <section className="wire-panel">
        <SectionHeader
          title="Event"
          subtitle="See who is organizing this, when it happens, and how to join."
          actionNode={
            <Link href="/events" className="wire-link">
              Back to events
            </Link>
          }
        />
        <div className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-[28px] font-semibold leading-[34px] tracking-tight break-words text-wire-100">
                {event.title}
              </h2>
            </div>
            <TagChip label={statusLabel} tone="status" />
          </div>
          <div className="flex flex-wrap gap-2">
            <TagChip label={event.category} active />
            <TagChip label="Campus" tone="status" />
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-[var(--radius-input)] border border-wire-700 bg-wire-800 px-3 py-2">
              <p className="wire-label">Date / Time</p>
              <p className="mt-1 text-sm text-wire-100">{dateLabel}</p>
            </div>
            <div className="rounded-[var(--radius-input)] border border-wire-700 bg-wire-800 px-3 py-2">
              <p className="wire-label">Location</p>
              <p className="mt-1 text-sm text-wire-100">{locationLabel}</p>
            </div>
            <div className="rounded-[var(--radius-input)] border border-wire-700 bg-wire-800 px-3 py-2">
              <p className="wire-label">Organizer</p>
              <p className="mt-1 text-sm text-wire-100">{organizerLabel}</p>
              <p className="mt-1 wire-meta">{organizerContextLabel}</p>
            </div>
            <div className="rounded-[var(--radius-input)] border border-wire-700 bg-wire-800 px-3 py-2">
              <p className="wire-label">Joining</p>
              <p className="mt-1 text-sm text-wire-100">
                Going means you plan to attend. Interested helps you keep track of the event.
              </p>
            </div>
          </div>
        </div>
      </section>

      {message ? <FeedbackBanner tone="success" message={message} /> : null}
      {error ? <FeedbackBanner tone="error" message={error} /> : null}
      {isPendingReview && isOwner ? (
        <FeedbackBanner tone="warning" message="This event is pending review and visible only to you." />
      ) : null}
      {isRejected && isOwner ? (
        <FeedbackBanner tone="error" message="This event was rejected and is hidden from public discovery." />
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.45fr_1fr]">
        <div className="space-y-6">
          {coverUrl ? (
            <SectionCard title="Cover" subtitle="Visual context from the organizer.">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={coverUrl}
                alt={event.title}
                className="h-64 w-full rounded-[var(--radius-input)] border border-wire-700 bg-wire-950/70 object-contain sm:h-72 lg:h-[30rem]"
              />
            </SectionCard>
          ) : (
            <div className="wire-inline-empty">No cover image uploaded.</div>
          )}

          <SectionCard
            title="About this event"
            subtitle="What to know before you join."
          >
            <p className="whitespace-pre-wrap break-words text-[14px] leading-relaxed text-wire-200 [overflow-wrap:anywhere]">
              {descriptionLabel}
            </p>
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard
            title="Organizer"
            subtitle="Who is running this event."
          >
            <div className="space-y-1.5">
              <p className="text-sm text-wire-100">{organizerLabel}</p>
              <p className="wire-meta">{organizerContextLabel}</p>
              {organizer?.user_id ? (
                <Link href={`/connect/people/${organizer.user_id}`} className="wire-link inline-flex">
                  View organizer profile
                </Link>
              ) : null}
            </div>
          </SectionCard>

          {isPublished ? (
            <SectionCard
              title="Participation"
              subtitle="Going means you plan to attend. Interested helps you keep track of the event."
            >
              <div className="mb-3 grid grid-cols-2 gap-2">
                <div className="rounded-[var(--radius-input)] border border-wire-700 bg-wire-800 px-3 py-2">
                  <p className="wire-label">Going</p>
                  <p className="mt-1 text-[14px] font-medium text-wire-100">{rsvpCounts.going}</p>
                  <p className="mt-1 wire-meta">Students planning to attend</p>
                </div>
                <div className="rounded-[var(--radius-input)] border border-wire-700 bg-wire-800 px-3 py-2">
                  <p className="wire-label">Interested</p>
                  <p className="mt-1 text-[14px] font-medium text-wire-100">{rsvpCounts.interested}</p>
                  <p className="mt-1 wire-meta">Students keeping track of it</p>
                </div>
              </div>

              <div className="rounded-[var(--radius-input)] border border-wire-700 bg-wire-800 px-3 py-2">
                <p className="wire-label">Your current status</p>
                <p className="mt-1 text-sm font-medium text-wire-100">{participationState.label}</p>
                <p className="mt-1 wire-meta">{participationState.description}</p>
              </div>

              <div className="wire-action-row mt-3">
                <form action={setEventParticipationAction} className="w-full">
                  <input type="hidden" name="eventId" value={event.id} />
                  <input type="hidden" name="status" value="going" />
                  <input type="hidden" name="redirectTo" value={`/events/${event.id}`} />
                  <SubmitButton
                    label={goingActive ? "Going" : "Mark going"}
                    pendingLabel="Updating RSVP..."
                    variant="primary"
                    className="w-full"
                  />
                </form>
                <form action={setEventParticipationAction} className="w-full">
                  <input type="hidden" name="eventId" value={event.id} />
                  <input type="hidden" name="status" value="interested" />
                  <input type="hidden" name="redirectTo" value={`/events/${event.id}`} />
                  <SubmitButton
                    label={interestedActive ? "Interested" : "Mark interested"}
                    pendingLabel="Updating RSVP..."
                    className="w-full"
                  />
                </form>
              </div>

              {isOwner ? (
                <div className="mt-3">
                  <ShellButton label="Manage event" href={`/events/${event.id}/edit`} variant="default" />
                </div>
              ) : null}

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <form action={toggleSavedEventAction} className="w-full">
                  <input type="hidden" name="eventId" value={event.id} />
                  <input type="hidden" name="redirectTo" value={`/events/${event.id}`} />
                  <SubmitButton
                    label={isSaved ? "Remove from saved" : "Save for later"}
                    pendingLabel={isSaved ? "Removing..." : "Saving..."}
                    className="w-full"
                  />
                </form>
                <form action={clearEventParticipationAction} className="w-full">
                  <input type="hidden" name="eventId" value={event.id} />
                  <input type="hidden" name="redirectTo" value={`/events/${event.id}`} />
                  <SubmitButton label="Clear RSVP" pendingLabel="Clearing..." className="w-full" />
                </form>
              </div>
              <p className="mt-3 text-[12px] leading-relaxed text-wire-300">
                {isOwner ? (
                  "Students use Going and Interested to track this event. Keep the schedule and location current if details change."
                ) : (
                  <>
                    Track this in{" "}
                    <Link href="/events/my-events" className="wire-link inline">
                      My Events
                    </Link>{" "}
                    and update your RSVP if your plans change.
                  </>
                )}
              </p>
              {!isOwner ? (
                <div className="mt-3">
                  <form action={reportContentAction}>
                    <input type="hidden" name="targetType" value="event" />
                    <input type="hidden" name="targetId" value={event.id} />
                    <input type="hidden" name="reason" value="inappropriate" />
                    <input type="hidden" name="redirectTo" value={`/events/${event.id}`} />
                    <SubmitButton
                      label="Report event"
                      pendingLabel="Submitting..."
                      variant="ghost"
                      className="w-auto"
                    />
                  </form>
                </div>
              ) : null}
            </SectionCard>
          ) : null}
        </div>
      </div>
    </main>
  );
}
