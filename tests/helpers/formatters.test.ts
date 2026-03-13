import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/session", () => ({
  requireUser: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { formatParticipationLabel } from "@/lib/events/data";
import { formatPriceKzt, formatStatusLabel } from "@/lib/market/data";
import { getOnboardingRoute } from "@/lib/profile/onboarding";

describe("pure format and mapping helpers", () => {
  it("formats listing price and status labels", () => {
    expect(formatPriceKzt(12500)).toBe("12,500 KZT");
    expect(formatStatusLabel("active")).toBe("Active");
  });

  it("formats participation labels", () => {
    expect(formatParticipationLabel("going")).toBe("Going");
    expect(formatParticipationLabel("interested")).toBe("Interested");
  });

  it("maps onboarding steps to routes", () => {
    expect(getOnboardingRoute("profile")).toBe("/onboarding/profile");
    expect(getOnboardingRoute("professional")).toBe("/onboarding/professional");
    expect(getOnboardingRoute("completed")).toBe("/home");
    expect(getOnboardingRoute("unexpected" as never)).toBe("/onboarding/profile");
  });
});
