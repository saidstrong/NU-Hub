"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  getStringValue,
  redirectWithError,
  sanitizeInternalPath,
} from "@/lib/actions/helpers";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const markNotificationReadSchema = z.object({
  notificationId: z.string().uuid("Invalid notification id."),
  redirectTo: z.string().optional(),
});

export async function markNotificationReadAction(formData: FormData) {
  const parsed = markNotificationReadSchema.safeParse({
    notificationId: getStringValue(formData, "notificationId"),
    redirectTo: getStringValue(formData, "redirectTo"),
  });

  if (!parsed.success) {
    redirectWithError(
      "/profile/notifications",
      parsed.error.issues[0]?.message ?? "Invalid notification input.",
    );
  }

  const user = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", parsed.data.notificationId)
    .eq("user_id", user.id);

  if (error) {
    redirectWithError("/profile/notifications", "Failed to update notification.");
  }

  revalidatePath("/profile");
  revalidatePath("/profile/notifications");

  const redirectTo = sanitizeInternalPath(parsed.data.redirectTo, "/profile/notifications");
  redirect(redirectTo);
}
