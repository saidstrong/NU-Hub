import { headers } from "next/headers";

export async function getClientIp(): Promise<string> {
  const headerStore = await headers();
  const forwardedFor = headerStore.get("x-forwarded-for");

  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }

  const realIp = headerStore.get("x-real-ip")?.trim();
  return realIp || "unknown";
}
