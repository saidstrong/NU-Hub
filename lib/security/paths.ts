import { logSecurityEvent } from "@/lib/observability/logger";

const CONTROL_CHAR_PATTERN = /[\u0000-\u001f\u007f]/;

function decodePathForValidation(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function isSafeInternalPath(path: string | null | undefined): path is string {
  if (typeof path !== "string") return false;

  const candidate = path.trim();
  if (!candidate.startsWith("/")) return false;

  const decoded = decodePathForValidation(candidate);

  if (candidate.startsWith("//") || decoded.startsWith("//")) return false;
  if (candidate.startsWith("/\\") || decoded.startsWith("/\\")) return false;
  if (candidate.includes("\\") || decoded.includes("\\")) return false;

  if (CONTROL_CHAR_PATTERN.test(candidate) || CONTROL_CHAR_PATTERN.test(decoded)) {
    return false;
  }

  return true;
}

export function sanitizeInternalPathValue(
  path: string | null | undefined,
  fallback: string,
): string {
  const rawPath = path;

  if (!isSafeInternalPath(path)) {
    if (typeof rawPath === "string" && rawPath.trim().length > 0) {
      logSecurityEvent("redirect_path_sanitized", {
        attemptedPath: rawPath.slice(0, 200),
        fallback,
      });
    }

    return fallback;
  }

  return path.trim();
}
