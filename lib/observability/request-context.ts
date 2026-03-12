import { headers } from "next/headers";
import { getClientIp } from "@/lib/security/request";

type RequestContextExtras = Record<string, unknown>;

function maskIpAddress(ip: string): string {
  if (!ip || ip === "unknown") return "unknown";

  if (ip.includes(":")) {
    const parts = ip.split(":").filter(Boolean);
    return parts.length > 2 ? `${parts.slice(0, 2).join(":")}:*` : `${ip}:*`;
  }

  const parts = ip.split(".");
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.*.*`;
  }

  return "masked";
}

export async function getRequestContext(
  extras: RequestContextExtras = {},
): Promise<Record<string, unknown>> {
  let requestId: string | null = null;
  let userAgent: string | null = null;
  let referer: string | null = null;

  try {
    const headerStore = await headers();
    requestId = headerStore.get("x-request-id") ?? headerStore.get("x-vercel-id");
    userAgent = headerStore.get("user-agent");
    referer = headerStore.get("referer");
  } catch {
    // Request headers may be unavailable in some internal contexts.
  }

  let ip = "unknown";
  try {
    ip = await getClientIp();
  } catch {
    ip = "unknown";
  }

  return {
    requestId: requestId ?? "unknown",
    ip: maskIpAddress(ip),
    userAgent,
    referer,
    ...extras,
  };
}
