import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database";

export type NotificationType = Database["public"]["Tables"]["notifications"]["Row"]["type"];

export type NotificationWriteInput = {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string | null;
  payload?: Json;
};

function sanitizeNotificationLink(link?: string | null): string | null {
  if (!link || !link.startsWith("/") || link.startsWith("//")) {
    return null;
  }

  return link;
}

export async function writeInAppNotification(
  supabase: SupabaseClient<Database>,
  input: NotificationWriteInput,
) {
  const { error } = await supabase.from("notifications").insert({
    user_id: input.userId,
    type: input.type,
    title: input.title,
    message: input.message,
    link: sanitizeNotificationLink(input.link),
    payload: input.payload ?? {},
  });

  if (error) {
    console.error("Failed to write in-app notification:", error.message);
  }
}

