import { requireUser } from "@/lib/auth/session";
import { formatCampusMessageTimestamp } from "@/lib/datetime";
import { getDurationMs, logWarn } from "@/lib/observability/logger";
import { createPaginationWindow, splitPaginatedRows } from "@/lib/pagination";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];
export type NotificationListRow = Pick<
  NotificationRow,
  "id" | "type" | "title" | "message" | "link" | "is_read" | "created_at" | "payload"
>;
export type PaginatedNotificationResult = {
  notifications: NotificationListRow[];
  hasMore: boolean;
};
export type NotificationReadSummary = {
  unreadCount: number;
  totalCount: number;
};
const LOADER_SLOW_THRESHOLD_MS = 150;

export async function getMyNotifications(limit = 50): Promise<NotificationListRow[]> {
  const { notifications } = await getMyNotificationsPage(1, limit);
  return notifications;
}

export async function getMyNotificationsPage(
  page = 1,
  pageSize = 20,
): Promise<PaginatedNotificationResult> {
  const startedAt = performance.now();
  let viewerId: string | null = null;
  let outcome: "success" | "error" = "success";

  try {
    const { from, to, pageSize: safePageSize } = createPaginationWindow({
      page,
      pageSize,
      defaultPageSize: 20,
      maxPageSize: 50,
    });
    const user = await requireUser();
    viewerId = user.id;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("notifications")
      .select("id, type, title, message, link, is_read, created_at, payload")
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
  } catch (error) {
    outcome = "error";
    logWarn("notifications", "notifications_page_loader_failed", {
      action: "getMyNotificationsPage",
      userId: viewerId,
      route: "/profile/notifications",
      durationMs: getDurationMs(startedAt),
      outcome,
      error:
        error instanceof Error
          ? { name: error.name, message: error.message }
          : { name: "UnknownError" },
    });
    throw error;
  } finally {
    const durationMs = getDurationMs(startedAt);
    if (durationMs > LOADER_SLOW_THRESHOLD_MS) {
      logWarn("notifications", "notifications_page_loader_slow", {
        action: "getMyNotificationsPage",
        userId: viewerId,
        route: "/profile/notifications",
        durationMs,
        outcome,
      });
    }
  }
}

export async function getMyNotificationReadSummary(): Promise<NotificationReadSummary> {
  const startedAt = performance.now();
  let viewerId: string | null = null;
  let outcome: "success" | "error" = "success";

  try {
    const user = await requireUser();
    viewerId = user.id;
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
  } catch (error) {
    outcome = "error";
    logWarn("notifications", "notifications_summary_loader_failed", {
      action: "getMyNotificationReadSummary",
      userId: viewerId,
      route: "/profile/notifications",
      durationMs: getDurationMs(startedAt),
      outcome,
      error:
        error instanceof Error
          ? { name: error.name, message: error.message }
          : { name: "UnknownError" },
    });
    throw error;
  } finally {
    const durationMs = getDurationMs(startedAt);
    if (durationMs > LOADER_SLOW_THRESHOLD_MS) {
      logWarn("notifications", "notifications_summary_loader_slow", {
        action: "getMyNotificationReadSummary",
        userId: viewerId,
        route: "/profile/notifications",
        durationMs,
        outcome,
      });
    }
  }
}

export function formatNotificationTime(createdAt: string): string {
  return formatCampusMessageTimestamp(createdAt);
}
