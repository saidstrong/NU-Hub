import { describe, expect, it } from "vitest";
import {
  eventCreateSchema,
  nuLocalDateTimeToUtcIso,
  utcIsoToNuLocalDateTimeInput,
} from "@/lib/validation/events";

describe("events validation", () => {
  it("parses valid event creation input", () => {
    const result = eventCreateSchema.safeParse({
      title: "NU Product Meetup",
      description: "A student meetup for product collaboration.",
      category: "Workshops",
      startsAtInput: "2026-04-10T18:00",
      endsAtInput: "2026-04-10T19:30",
      location: "C3.200 Auditorium",
      isPublishedInput: "true",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("NU Product Meetup");
      expect(result.data.isPublishedInput).toBe(true);
    }
  });

  it("rejects end time before start time", () => {
    const result = eventCreateSchema.safeParse({
      title: "NU Demo Day",
      description: "",
      category: "Career",
      startsAtInput: "2026-04-10T19:30",
      endsAtInput: "2026-04-10T18:00",
      location: "Main Hall",
      isPublishedInput: "false",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.endsAtInput?.[0]).toBe(
        "End time must be after the start time.",
      );
    }
  });

  it("transforms publish input into boolean", () => {
    const result = eventCreateSchema.safeParse({
      title: "NU Study Session",
      description: "",
      category: "Clubs",
      startsAtInput: "2026-05-01T10:00",
      endsAtInput: "",
      location: "Library Hall",
      isPublishedInput: "false",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isPublishedInput).toBe(false);
      expect(result.data.description).toBeNull();
      expect(result.data.endsAtInput).toBeNull();
    }
  });

  it("converts NU local datetime to UTC ISO deterministically", () => {
    expect(nuLocalDateTimeToUtcIso("2026-03-12T15:30")).toBe(
      "2026-03-12T10:30:00.000Z",
    );
    expect(nuLocalDateTimeToUtcIso("invalid")).toBeNull();
  });

  it("converts UTC ISO to NU local datetime input deterministically", () => {
    expect(utcIsoToNuLocalDateTimeInput("2026-03-12T10:30:00.000Z")).toBe(
      "2026-03-12T15:30",
    );
    expect(utcIsoToNuLocalDateTimeInput("invalid")).toBeNull();
  });

  it("keeps datetime conversion roundtrip stable for edit prefills", () => {
    const initialLocal = "2026-06-02T09:15";
    const utcIso = nuLocalDateTimeToUtcIso(initialLocal);

    expect(utcIso).toBe("2026-06-02T04:15:00.000Z");
    expect(utcIsoToNuLocalDateTimeInput(utcIso ?? "")).toBe(initialLocal);
  });
});
