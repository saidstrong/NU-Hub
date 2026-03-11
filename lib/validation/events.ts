import { z } from "zod";

export const toggleSavedEventSchema = z.object({
  eventId: z.string().uuid("Invalid event id."),
  redirectTo: z.string().optional(),
});

export const eventParticipationSchema = z.object({
  eventId: z.string().uuid("Invalid event id."),
  status: z.enum(["interested", "joined"]),
  redirectTo: z.string().optional(),
});
