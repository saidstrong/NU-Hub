export type AppErrorCode =
  | "AUTH_ERROR"
  | "VALIDATION_ERROR"
  | "RATE_LIMITED"
  | "OWNERSHIP_VIOLATION"
  | "DATABASE_ERROR"
  | "STORAGE_ERROR"
  | "REDIRECT_SANITIZED"
  | "UNKNOWN_ERROR";

type AppErrorOptions = {
  safeMessage?: string;
  cause?: unknown;
  metadata?: Record<string, unknown>;
};

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly safeMessage: string;
  readonly metadata?: Record<string, unknown>;

  constructor(code: AppErrorCode, message: string, options: AppErrorOptions = {}) {
    super(message, options.cause ? { cause: options.cause } : undefined);
    this.name = "AppError";
    this.code = code;
    this.safeMessage = options.safeMessage ?? message;
    this.metadata = options.metadata;
  }
}

export function createAppError(
  code: AppErrorCode,
  message: string,
  options: AppErrorOptions = {},
): AppError {
  return new AppError(code, message, options);
}

export function normalizeToAppError(
  error: unknown,
  fallbackCode: AppErrorCode = "UNKNOWN_ERROR",
  fallbackSafeMessage = "Something went wrong.",
): AppError {
  if (error instanceof AppError) return error;

  if (error instanceof Error) {
    return new AppError(fallbackCode, error.message, {
      safeMessage: fallbackSafeMessage,
      cause: error,
    });
  }

  return new AppError(fallbackCode, "Unknown error", {
    safeMessage: fallbackSafeMessage,
    metadata: { error },
  });
}
