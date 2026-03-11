"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

function getStringValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function sanitizeInternalPath(path: string | undefined, fallback: string): string {
  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return fallback;
  }

  return path;
}

function redirectWithError(path: string, message: string): never {
  const params = new URLSearchParams({ error: message });
  redirect(`${path}?${params.toString()}`);
}

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

