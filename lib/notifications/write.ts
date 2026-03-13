import type { SupabaseClient } from "@supabase/supabase-js";
import * as Sentry from "@sentry/nextjs";
import { logWarn } from "@/lib/observability/logger";
import { sanitizeInternalPathValue } from "@/lib/security/paths";
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

const EXPECTED_NOTIFICATION_WRITE_ERROR_CODES = new Set(["42501"]);

function sanitizeNotificationLink(link?: string | null): string | null {
  if (!link) {
    return null;
  }

  const sanitized = sanitizeInternalPathValue(link, "");
  return sanitized || null;
}

function sanitizeNotificationText(value: string, maxLength: number): string {
  const trimmed = value.trim();
  return trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed;
}

function sanitizeNotificationPayload(payload: Json | undefined): Json {
  const safePayload = payload ?? {};

  try {
    const serialized = JSON.stringify(safePayload);
    if (serialized.length > 4000) {
      return {};
    }
  } catch {
    return {};
  }

  return safePayload;
}

function getErrorCode(error: unknown): string | null {
  if (!error || typeof error !== "object") {
    return null;
  }

  const candidate = (error as { code?: unknown }).code;
  return typeof candidate === "string" ? candidate : null;
}

export async function writeInAppNotification(
  supabase: SupabaseClient<Database>,
  input: NotificationWriteInput,
) {
  const route = sanitizeNotificationLink(input.link);

  try {
    const { error } = await supabase.from("notifications").insert({
      user_id: input.userId,
      type: input.type,
      title: sanitizeNotificationText(input.title, 120),
      message: sanitizeNotificationText(input.message, 500),
      link: route,
      payload: sanitizeNotificationPayload(input.payload),
    });

    if (!error) {
      return;
    }

    logWarn("notifications", "notification_write_failed", {
      action: "writeInAppNotification",
      userId: input.userId,
      route,
      outcome: "error",
      errorCode: error.code ?? null,
    });

    if (!EXPECTED_NOTIFICATION_WRITE_ERROR_CODES.has(error.code ?? "")) {
      Sentry.captureException(error, {
        tags: {
          domain: "notifications",
          action: "writeInAppNotification",
        },
        extra: {
          route,
          errorCode: error.code ?? null,
        },
      });
    }
  } catch (error) {
    logWarn("notifications", "notification_write_exception", {
      action: "writeInAppNotification",
      userId: input.userId,
      route,
      outcome: "error",
      errorCode: getErrorCode(error),
    });

    Sentry.captureException(error, {
      tags: {
        domain: "notifications",
        action: "writeInAppNotification",
      },
      extra: {
        route,
      },
    });
  }
}
