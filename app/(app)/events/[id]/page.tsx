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
  const isDraft = !event.is_published;
  const dateLabel = formatEventDate(event.starts_at, event.ends_at);
  const organizerLabel = organizer?.full_name || "NU event organizer";
  const interestedActive = participationStatus === "interested";
  const goingActive = participationStatus === "going";
  const organizerMeta = [organizer?.school, organizer?.major, organizer?.year_label]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(" - ");
  const locationLabel =
    typeof event.location === "string" && event.location.trim().length > 0
      ? event.location.trim()
      : "Location to be confirmed";
  const descriptionLabel =
    typeof event.description === "string" && event.description.trim().length > 0
      ? event.description.trim()
      : "No additional event description provided.";
  const rsvpStateLabel =
    participationStatus === "going"
      ? "Going"
      : participationStatus === "interested"
        ? "Interested"
        : "No RSVP yet";
  const coverUrl = toPublicStorageUrl("event-images", event.cover_path);

  return (
    <main>
      <section className="wire-panel">
        <SectionHeader
          title="Event"
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
            <TagChip label={isDraft ? "Draft" : "Published"} tone="status" />
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
              <p className="wire-label">Host</p>
              <p className="mt-1 text-sm text-wire-100">{organizerLabel}</p>
            </div>
            <div className="rounded-[var(--radius-input)] border border-wire-700 bg-wire-800 px-3 py-2">
              <p className="wire-label">Host context</p>
              <p className="mt-1 text-sm text-wire-100">{organizerMeta || "Campus organizer profile"}</p>
            </div>
          </div>
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

      <div className="grid gap-6 xl:grid-cols-[1.45fr_1fr]">
        <div className="space-y-6">
          {coverUrl ? (
            <SectionCard title="Cover" subtitle="Visual context for this event.">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={coverUrl}
                alt={event.title}
                className="h-56 w-full rounded-[var(--radius-input)] border border-wire-700 bg-wire-900 object-cover"
              />
            </SectionCard>
          ) : (
            <div className="wire-inline-empty">No cover image uploaded.</div>
          )}

          <SectionCard
            title="Description"
            subtitle="Additional context from the organizer."
          >
            <p className="text-[14px] leading-relaxed text-wire-200">
              {descriptionLabel}
            </p>
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard
            title="Host"
            subtitle="Organizer context for attendance confidence."
          >
            <div className="space-y-1.5">
              <p className="text-sm text-wire-100">{organizerLabel}</p>
              <p className="wire-meta">{organizerMeta || "Campus organizer profile"}</p>
              {organizer?.user_id ? (
                <Link href={`/connect/people/${organizer.user_id}`} className="wire-link inline-flex">
                  View organizer profile
                </Link>
              ) : null}
            </div>
          </SectionCard>

          {!isDraft ? (
            <SectionCard
              title="RSVP"
              subtitle="Set intent and track participation signals."
            >
              <div className="mb-3 grid grid-cols-2 gap-2">
                <div className="rounded-[var(--radius-input)] border border-wire-700 bg-wire-800 px-3 py-2">
                  <p className="wire-label">Going</p>
                  <p className="mt-1 text-[14px] font-medium text-wire-100">{rsvpCounts.going}</p>
                </div>
                <div className="rounded-[var(--radius-input)] border border-wire-700 bg-wire-800 px-3 py-2">
                  <p className="wire-label">Interested</p>
                  <p className="mt-1 text-[14px] font-medium text-wire-100">{rsvpCounts.interested}</p>
                </div>
                <p className="col-span-2 wire-meta">Your RSVP: {rsvpStateLabel}</p>
              </div>

              <div className="wire-action-row">
                <form action={setEventParticipationAction} className="w-full">
                  <input type="hidden" name="eventId" value={event.id} />
                  <input type="hidden" name="status" value="going" />
                  <input type="hidden" name="redirectTo" value={`/events/${event.id}`} />
                  <button type="submit" className="wire-action-primary w-full">
                    {goingActive ? "Going" : "Mark going"}
                  </button>
                </form>
                <form action={setEventParticipationAction} className="w-full">
                  <input type="hidden" name="eventId" value={event.id} />
                  <input type="hidden" name="status" value="interested" />
                  <input type="hidden" name="redirectTo" value={`/events/${event.id}`} />
                  <button type="submit" className="wire-action w-full">
                    {interestedActive ? "Interested" : "Mark interested"}
                  </button>
                </form>
              </div>

              {isOwner ? (
                <div className="mt-3">
                  <ShellButton label="Edit event" href={`/events/${event.id}/edit`} variant="default" />
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
          ) : null}
        </div>
      </div>
    </main>
  );
}
