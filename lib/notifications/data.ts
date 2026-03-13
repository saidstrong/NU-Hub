import { requireUser } from "@/lib/auth/session";
import { createPaginationWindow, splitPaginatedRows } from "@/lib/pagination";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];
export type NotificationListRow = Pick<
  NotificationRow,
  "id" | "type" | "title" | "message" | "link" | "is_read" | "created_at"
>;
export type PaginatedNotificationResult = {
  notifications: NotificationListRow[];
  hasMore: boolean;
};
export type NotificationReadSummary = {
  unreadCount: number;
  totalCount: number;
};

export async function getMyNotifications(limit = 50): Promise<NotificationListRow[]> {
  const { notifications } = await getMyNotificationsPage(1, limit);
  return notifications;
}

export async function getMyNotificationsPage(
  page = 1,
  pageSize = 20,
): Promise<PaginatedNotificationResult> {
  const { from, to, pageSize: safePageSize } = createPaginationWindow({
    page,
    pageSize,
    defaultPageSize: 20,
    maxPageSize: 50,
  });
  const user = await requireUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("notifications")
    .select("id, type, title, message, link, is_read, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, to);

  if (error) {
    throw new Error("Failed to load notifications.");
  }

  const paged = splitPaginatedRows(data, safePageSize);
  return {
    notifications: paged.rows,
    hasMore: paged.hasMore,
  };
}

export async function getMyNotificationReadSummary(): Promise<NotificationReadSummary> {
  const user = await requireUser();
  const supabase = await createClient();

  const [unreadCountResult, totalCountResult] = await Promise.all([
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
  ]);

  if (unreadCountResult.error || totalCountResult.error) {
    throw new Error("Failed to load notifications.");
  }

  return {
    unreadCount: unreadCountResult.count ?? 0,
    totalCount: totalCountResult.count ?? 0,
  };
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
