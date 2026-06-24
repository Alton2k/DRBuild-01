const maxDealUrlLength = 2048;

const blockedHostFragments = [
  "bit.ly",
  "cutt.ly",
  "discord.com",
  "discord.gg",
  "facebook.com",
  "instagram.com",
  "is.gd",
  "linkedin.com",
  "netflix.com",
  "pinterest.com",
  "reddit.com",
  "spotify.com",
  "t.co",
  "t.me",
  "telegram.me",
  "tiktok.com",
  "tinyurl.com",
  "twitch.tv",
  "twitter.com",
  "x.com",
  "youtu.be",
  "youtube.com",
];

const riskyDownloadExtensions = [
  ".apk",
  ".bat",
  ".cmd",
  ".dmg",
  ".exe",
  ".jar",
  ".js",
  ".msi",
  ".pkg",
  ".ps1",
  ".scr",
  ".vbs",
];

function isBlockedHost(hostname: string) {
  return blockedHostFragments.some((host) => hostname === host || hostname.endsWith(`.${host}`));
}

function isPrivateIpv4(hostname: string) {
  const parts = hostname.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false;
  }

  const [first, second] = parts;
  return (
    first === 10 ||
    first === 127 ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 169 && second === 254) ||
    first === 0
  );
}

export function validateDealUrl(value: string): { ok: true; url: string; hostname: string } | { ok: false; error: string } {
  const trimmed = value.trim();

  if (!trimmed) {
    return { ok: false, error: "Paste the deal URL." };
  }

  if (trimmed.length > maxDealUrlLength) {
    return { ok: false, error: "URL is too long." };
  }

  try {
    const parsed = new URL(trimmed);
    const hostname = parsed.hostname.toLowerCase().replace(/^www\./, "");
    const pathname = parsed.pathname.toLowerCase();

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { ok: false, error: "Use a full http:// or https:// URL." };
    }

    if (parsed.username || parsed.password) {
      return { ok: false, error: "URL credentials are not supported." };
    }

    if (
      hostname === "localhost" ||
      hostname.endsWith(".localhost") ||
      hostname.endsWith(".local") ||
      isPrivateIpv4(hostname) ||
      hostname.includes(":")
    ) {
      return { ok: false, error: "Private or local URLs cannot be posted." };
    }

    if (isBlockedHost(hostname)) {
      return { ok: false, error: "Use a product, store, or promo page link instead." };
    }

    if (riskyDownloadExtensions.some((extension) => pathname.endsWith(extension))) {
      return { ok: false, error: "Direct app or executable download links are not allowed." };
    }

    return { ok: true, url: parsed.toString(), hostname };
  } catch {
    return { ok: false, error: "Use a full http:// or https:// URL." };
  }
}

export function isProcessableDealUrl(value: string) {
  return validateDealUrl(value).ok;
}

export function validateSafeExternalUrl(
  value: string,
  options: { allowMailto?: boolean } = {},
): { ok: true; url: string } | { ok: false } {
  const trimmed = value.trim();

  if (!trimmed || trimmed.length > maxDealUrlLength) {
    return { ok: false };
  }

  try {
    const parsed = new URL(trimmed);
    const hostname = parsed.hostname.toLowerCase().replace(/^www\./, "");
    const pathname = parsed.pathname.toLowerCase();

    if (options.allowMailto && parsed.protocol === "mailto:") {
      return parsed.username || parsed.password ? { ok: false } : { ok: true, url: parsed.toString() };
    }

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { ok: false };
    }

    if (
      parsed.username ||
      parsed.password ||
      hostname === "localhost" ||
      hostname.endsWith(".localhost") ||
      hostname.endsWith(".local") ||
      isPrivateIpv4(hostname) ||
      hostname.includes(":") ||
      isBlockedHost(hostname) ||
      riskyDownloadExtensions.some((extension) => pathname.endsWith(extension))
    ) {
      return { ok: false };
    }

    return { ok: true, url: parsed.toString() };
  } catch {
    return { ok: false };
  }
}
