import { AppError, normalizeToAppError } from "@/lib/observability/errors";

type LogLevel = "info" | "warn" | "error";

type LogEntry = {
  timestamp: string;
  level: LogLevel;
  scope: string;
  event: string;
  message?: string;
  context?: Record<string, unknown>;
};

const REDACT_KEYS = new Set([
  "password",
  "token",
  "access_token",
  "refresh_token",
  "authorization",
  "cookie",
  "set-cookie",
  "secret",
]);

function sanitizeValue(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[truncated]";

  if (typeof value === "string") {
    return value.length > 400 ? `${value.slice(0, 400)}...[truncated]` : value;
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    value === null ||
    typeof value === "undefined"
  ) {
    return value;
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
    };
  }

  if (Array.isArray(value)) {
    return value.slice(0, 30).map((item) => sanitizeValue(item, depth + 1));
  }

  if (typeof value === "object") {
    const source = value as Record<string, unknown>;
    const sanitized: Record<string, unknown> = {};

    for (const [key, nestedValue] of Object.entries(source)) {
      sanitized[key] = REDACT_KEYS.has(key.toLowerCase())
        ? "[redacted]"
        : sanitizeValue(nestedValue, depth + 1);
    }

    return sanitized;
  }

  return String(value);
}

function emit(level: LogLevel, entry: Omit<LogEntry, "timestamp" | "level">) {
  if (process.env.NODE_ENV === "test") return;

  const payload: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    scope: entry.scope,
    event: entry.event,
    message: entry.message,
    context: entry.context ? (sanitizeValue(entry.context) as Record<string, unknown>) : undefined,
  };

  const serialized = JSON.stringify(payload);

  if (level === "error") {
    console.error(serialized);
    return;
  }

  if (level === "warn") {
    console.warn(serialized);
    return;
  }

  console.log(serialized);
}

export function logInfo(
  scope: string,
  event: string,
  context?: Record<string, unknown>,
  message?: string,
) {
  emit("info", { scope, event, context, message });
}

export function logWarn(
  scope: string,
  event: string,
  context?: Record<string, unknown>,
  message?: string,
) {
  emit("warn", { scope, event, context, message });
}

export function logError(
  scope: string,
  event: string,
  context?: Record<string, unknown>,
  message?: string,
) {
  emit("error", { scope, event, context, message });
}

export function logSecurityEvent(
  event: string,
  context?: Record<string, unknown>,
  message?: string,
) {
  logWarn("security", event, context, message);
}

export function logAppError(
  scope: string,
  event: string,
  error: unknown,
  context: Record<string, unknown> = {},
) {
  const normalized = error instanceof AppError ? error : normalizeToAppError(error);

  logError(
    scope,
    event,
    {
      ...context,
      errorCode: normalized.code,
      safeMessage: normalized.safeMessage,
      metadata: normalized.metadata,
      cause:
        normalized.cause instanceof Error
          ? { name: normalized.cause.name, message: normalized.cause.message }
          : normalized.cause,
    },
    normalized.message,
  );
}
