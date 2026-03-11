import { z } from "zod";

export const communityJoinSchema = z.object({
  communityId: z.string().uuid("Invalid community id."),
  redirectTo: z.string().optional(),
});

export const communityRequestReviewSchema = z.object({
  communityId: z.string().uuid("Invalid community id."),
  userId: z.string().uuid("Invalid user id."),
  decision: z.enum(["approve", "reject"]),
  redirectTo: z.string().optional(),
});
