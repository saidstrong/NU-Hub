function capitalizeToken(token: string): string {
  if (!token) return token;
  return token[0].toUpperCase() + token.slice(1).toLowerCase();
}

function isMeaningfulName(value: string | null | undefined): boolean {
  const trimmed = value?.trim() ?? "";
  if (trimmed.length < 2) return false;
  if (trimmed.includes("@")) return false;
  return /[A-Za-z\u0400-\u04FF]/.test(trimmed);
}

function deriveNameFromEmail(email: string | null | undefined): string {
  const normalizedEmail = email?.trim().toLowerCase() ?? "";
  const atIndex = normalizedEmail.indexOf("@");
  if (atIndex <= 0) return "";

  const localPart = normalizedEmail.slice(0, atIndex);
  const cleaned = localPart
    .replace(/[._-]+/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return "";

  const tokens = cleaned
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length > 0 && !/^\d+$/.test(token))
    .map((token) => capitalizeToken(token));

  const suggestion = tokens.join(" ").trim();
  if (!isMeaningfulName(suggestion)) return "";

  return suggestion;
}

export function getSuggestedProfileName(
  fullName: string | null | undefined,
  email: string | null | undefined,
): string {
  if (isMeaningfulName(fullName)) {
    return fullName!.trim();
  }

  const derived = deriveNameFromEmail(email);
  if (derived) {
    return derived;
  }

  return fullName?.trim() ?? "";
}

