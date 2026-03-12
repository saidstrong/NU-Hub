import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];
export type NotificationListRow = Pick<
  NotificationRow,
  "id" | "type" | "title" | "message" | "link" | "is_read" | "created_at"
>;

export async function getMyNotifications(limit = 50): Promise<NotificationListRow[]> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("notifications")
    .select("id, type, title, message, link, is_read, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error("Failed to load notifications.");
  }

  return data;
}

export function formatNotificationTime(createdAt: string): string {
  const date = new Date(createdAt);

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
