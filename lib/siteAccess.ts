export const SITE_ACCESS_COOKIE = "dealrakyat_site_access";
export const SITE_ACCESS_SESSION_SECONDS = 15 * 60;

const minimumSecretLength = 32;
const encoder = new TextEncoder();

type SiteAccessEnvironment = {
  SITE_ACCESS_PIN?: string;
  SITE_ACCESS_SECRET?: string;
};

export type SiteAccessSettings =
  | { enabled: false; configured: false; pin: ""; secret: "" }
  | { enabled: true; configured: false; pin: string; secret: string }
  | { enabled: true; configured: true; pin: string; secret: string };

function toHex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(left: string, right: string) {
  const leftBytes = encoder.encode(left);
  const rightBytes = encoder.encode(right);
  const length = Math.max(leftBytes.length, rightBytes.length);
  let mismatch = leftBytes.length ^ rightBytes.length;

  for (let index = 0; index < length; index += 1) {
    mismatch |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }

  return mismatch === 0;
}

async function createSignature(secret: string, expiresAt: number) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`deal-rakyat-site-access:${expiresAt}`),
  );

  return toHex(signature);
}

export function getSiteAccessSettings(
  environment: SiteAccessEnvironment = {
    SITE_ACCESS_PIN: process.env.SITE_ACCESS_PIN,
    SITE_ACCESS_SECRET: process.env.SITE_ACCESS_SECRET,
  },
): SiteAccessSettings {
  const pin = environment.SITE_ACCESS_PIN?.trim() ?? "";
  const secret = environment.SITE_ACCESS_SECRET?.trim() ?? "";

  if (!pin) {
    return { enabled: false, configured: false, pin: "", secret: "" };
  }

  return {
    enabled: true,
    configured: secret.length >= minimumSecretLength,
    pin,
    secret,
  };
}

export function getSafeSiteAccessNext(value: string | null | undefined) {
  if (!value?.startsWith("/") || value.startsWith("//") || value.startsWith("/site-access")) {
    return "/";
  }

  return value;
}

export async function matchesSiteAccessPin(submitted: string, expected: string) {
  const [submittedHash, expectedHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(submitted)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);

  return constantTimeEqual(toHex(submittedHash), toHex(expectedHash));
}

export async function createSiteAccessToken(
  secret: string,
  now = Date.now(),
  sessionSeconds = SITE_ACCESS_SESSION_SECONDS,
) {
  const expiresAt = Math.floor(now / 1000) + sessionSeconds;
  const signature = await createSignature(secret, expiresAt);
  return `${expiresAt}.${signature}`;
}

export async function verifySiteAccessToken(token: string | undefined, secret: string, now = Date.now()) {
  if (!token || secret.length < minimumSecretLength) {
    return false;
  }

  const [expiresValue, suppliedSignature, extra] = token.split(".");
  const expiresAt = Number(expiresValue);
  if (extra !== undefined || !suppliedSignature || !Number.isSafeInteger(expiresAt)) {
    return false;
  }

  if (expiresAt <= Math.floor(now / 1000)) {
    return false;
  }

  const expectedSignature = await createSignature(secret, expiresAt);
  return constantTimeEqual(suppliedSignature, expectedSignature);
}
