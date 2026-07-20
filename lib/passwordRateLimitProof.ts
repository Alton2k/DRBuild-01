import { createHmac } from "node:crypto";
import { isIP } from "node:net";

export const passwordRateLimitIpHeader = "X-Deal-Rakyat-Client-IP";
export const passwordRateLimitTimestampHeader = "X-Deal-Rakyat-Client-IP-Timestamp";
export const passwordRateLimitSignatureHeader = "X-Deal-Rakyat-Client-IP-Signature";

const proofVersion = "v1";
const minimumSecretBytes = 32;

function assertProofValue(value: string, label: string) {
  if (!value.trim()) {
    throw new Error(`${label} is required for password rate limiting`);
  }
}

function createProofPayload(accountId: string, ipAddress: string, timestamp: string) {
  return [proofVersion, accountId, ipAddress, timestamp].join("\0");
}

function firstForwardedIp(value: string | null) {
  return value?.split(",")[0]?.trim() ?? "";
}

export function selectTrustedPasswordClientIp(
  getHeader: (name: string) => string | null,
  isProduction: boolean,
) {
  const vercelIp = firstForwardedIp(getHeader("x-vercel-forwarded-for"));
  if (vercelIp) return vercelIp;

  // Deal Rakyat production runs on Vercel, where the platform-controlled
  // header is required. Generic forwarding headers remain a local-dev fallback
  // only because an upstream client or custom proxy may be able to supply them.
  if (isProduction) return "";

  return (
    firstForwardedIp(getHeader("x-forwarded-for")) ||
    getHeader("x-real-ip")?.trim() ||
    ""
  );
}

export function createPasswordRateLimitProof({
  secret,
  accountId,
  ipAddress,
  now = new Date(),
}: {
  secret: string | undefined;
  accountId: string;
  ipAddress: string;
  now?: Date;
}) {
  if (!secret || Buffer.byteLength(secret, "utf8") < minimumSecretBytes) {
    throw new Error("PASSWORD_RATE_LIMIT_SECRET must contain at least 32 bytes");
  }
  assertProofValue(accountId, "accountId");
  assertProofValue(ipAddress, "ipAddress");
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) {
    throw new Error("A valid proof time is required for password rate limiting");
  }

  const timestamp = String(Math.floor(now.getTime() / 1000));
  const normalizedAccountId = accountId.trim();
  const normalizedIpAddress = ipAddress.trim().toLowerCase();
  if (!isIP(normalizedIpAddress)) {
    throw new Error("A valid client IP is required for password rate limiting");
  }
  const signature = createHmac("sha256", secret)
    .update(createProofPayload(normalizedAccountId, normalizedIpAddress, timestamp))
    .digest("hex");

  return {
    [passwordRateLimitIpHeader]: normalizedIpAddress,
    [passwordRateLimitTimestampHeader]: timestamp,
    [passwordRateLimitSignatureHeader]: signature,
  };
}

export function getPasswordRateLimitRetryMessage(value: string | null) {
  const seconds = Number(value);

  if (!Number.isSafeInteger(seconds) || seconds < 1 || seconds > 24 * 60 * 60) {
    return "Too many password change attempts. Please try again later.";
  }

  const minutes = Math.max(1, Math.ceil(seconds / 60));
  return `Too many password change attempts. Try again in ${minutes} ${minutes === 1 ? "minute" : "minutes"}.`;
}
