const CAMPUS_TIME_ZONE = "Asia/Almaty";

const CAMPUS_MESSAGE_TIMESTAMP_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: CAMPUS_TIME_ZONE,
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const CAMPUS_EVENT_DAY_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: CAMPUS_TIME_ZONE,
  month: "short",
  day: "numeric",
});

const CAMPUS_EVENT_TIME_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: CAMPUS_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const CAMPUS_DAY_KEY_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: CAMPUS_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

function toCampusDayKey(value: Date): string {
  return CAMPUS_DAY_KEY_FORMATTER.format(value);
}

export function formatCampusMessageTimestamp(value: string | Date): string {
  return CAMPUS_MESSAGE_TIMESTAMP_FORMATTER.format(toDate(value));
}

export function formatCampusEventDateRange(
  startsAt: string | Date,
  endsAt: string | Date | null,
): string {
  const start = toDate(startsAt);
  const startLabel = `${CAMPUS_EVENT_DAY_FORMATTER.format(start)} - ${CAMPUS_EVENT_TIME_FORMATTER.format(start)}`;

  if (!endsAt) return startLabel;

  const end = toDate(endsAt);
  if (toCampusDayKey(start) === toCampusDayKey(end)) {
    return `${startLabel}-${CAMPUS_EVENT_TIME_FORMATTER.format(end)}`;
  }

  return `${startLabel} -> ${CAMPUS_EVENT_DAY_FORMATTER.format(end)} - ${CAMPUS_EVENT_TIME_FORMATTER.format(end)}`;
}

