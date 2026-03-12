import { describe, expect, it } from "vitest";
import {
  communityMutationIdSchema,
  createCommunitySchema,
  updateCommunitySchema,
} from "@/lib/validation/connect";

describe("connect validation", () => {
  it("parses community create input with normalized optional fields", () => {
    const result = createCommunitySchema.safeParse({
      name: "NU Robotics",
      description: "A student community for robotics projects and meetups.",
      category: "   ",
      tagsInput: "ai, robotics, ai, hardware",
      joinType: "request",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.category).toBeNull();
      expect(result.data.tagsInput).toEqual(["ai", "robotics", "hardware"]);
      expect(result.data.joinType).toBe("request");
    }
  });

  it("caps parsed tags to 10 entries", () => {
    const tags = Array.from({ length: 12 }, (_, index) => `tag-${index + 1}`).join(", ");
    const result = createCommunitySchema.safeParse({
      name: "NU Builders",
      description: "A space for students building projects together on campus.",
      category: "Tech",
      tagsInput: tags,
      joinType: "open",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tagsInput).toHaveLength(10);
      expect(result.data.tagsInput[0]).toBe("tag-1");
      expect(result.data.tagsInput[9]).toBe("tag-10");
    }
  });

  it("rejects invalid join type", () => {
    const result = createCommunitySchema.safeParse({
      name: "NU Creators",
      description: "A student community for creative collaboration and events.",
      category: "Creative",
      tagsInput: "design, media",
      joinType: "closed",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path[0] === "joinType")).toBe(true);
    }
  });

  it("reuses create validation rules for update payloads", () => {
    const result = updateCommunitySchema.safeParse({
      name: "NU Product Guild",
      description: "A student community for product strategy, design critique, and ship reviews.",
      category: "Career",
      tagsInput: "product, design, product, research",
      joinType: "open",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tagsInput).toEqual(["product", "design", "research"]);
      expect(result.data.joinType).toBe("open");
    }
  });

  it("validates community mutation id as uuid", () => {
    expect(
      communityMutationIdSchema.safeParse({
        communityId: "192d11e4-f8bc-4881-b022-f9e2e2f83e58",
      }).success,
    ).toBe(true);
    expect(
      communityMutationIdSchema.safeParse({
        communityId: "invalid-community-id",
      }).success,
    ).toBe(false);
  });
});
