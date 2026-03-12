import { redirect } from "next/navigation";
import { sanitizeInternalPathValue } from "@/lib/security/paths";

export type FeedbackParamKey = "error" | "message";

export function getStringValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export function getStringArray(formData: FormData, key: string): string[] {
  return formData
    .getAll(key)
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);
}

export function sanitizeInternalPath(path: string | undefined, fallback: string): string {
  return sanitizeInternalPathValue(path, fallback);
}

export function appendSearchParam(path: string, key: FeedbackParamKey, value: string): string {
  const [pathname, queryString = ""] = path.split("?");
  const params = new URLSearchParams(queryString);
  params.set(key, value);
  const nextQuery = params.toString();

  return nextQuery ? `${pathname}?${nextQuery}` : pathname;
}

export function redirectWithFeedback(path: string, key: FeedbackParamKey, value: string): never {
  redirect(appendSearchParam(path, key, value));
}

export function redirectWithError(path: string, message: string): never {
  return redirectWithFeedback(path, "error", message);
}

export function redirectWithMessage(path: string, message: string): never {
  return redirectWithFeedback(path, "message", message);
}
