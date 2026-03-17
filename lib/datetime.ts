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

const CAMPUS_MONTH_DAY_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: CAMPUS_TIME_ZONE,
  month: "2-digit",
  day: "2-digit",
});

const PRIVATE_BIRTHDAY_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "long",
  day: "numeric",
  year: "numeric",
});

function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

function toCampusDayKey(value: Date): string {
  return CAMPUS_DAY_KEY_FORMATTER.format(value);
}

function parseBirthdayValue(value: string | null | undefined): {
  year: number;
  month: number;
  day: number;
} | null {
  if (!value) return null;
  const matched = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!matched) return null;

  const year = Number(matched[1]);
  const month = Number(matched[2]);
  const day = Number(matched[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year
    || parsed.getUTCMonth() !== month - 1
    || parsed.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
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

export function isBirthdayTodayInCampusTimeZone(value: string | null | undefined): boolean {
  const parsedBirthday = parseBirthdayValue(value);
  if (!parsedBirthday) return false;

  const todayMonthDay = CAMPUS_MONTH_DAY_FORMATTER.format(new Date());
  const birthdayMonthDay = `${String(parsedBirthday.month).padStart(2, "0")}-${String(parsedBirthday.day).padStart(2, "0")}`;
  return todayMonthDay === birthdayMonthDay;
}

export function formatPrivateBirthday(value: string | null | undefined): string | null {
  const parsedBirthday = parseBirthdayValue(value);
  if (!parsedBirthday) return null;

  const normalized = new Date(
    Date.UTC(parsedBirthday.year, parsedBirthday.month - 1, parsedBirthday.day),
  );
  return PRIVATE_BIRTHDAY_FORMATTER.format(normalized);
}
