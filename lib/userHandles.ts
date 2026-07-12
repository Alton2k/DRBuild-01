export const userHandleMinLength = 3;
export const userHandleMaxLength = 24;
export const userHandlePattern = /^[a-z0-9_][a-z0-9._]*[a-z0-9_]$/;

export function stripUserHandlePrefix(value: string) {
  return value.trim().replace(/^@+/, "");
}

export function normalizeUserHandle(value: string) {
  return stripUserHandlePrefix(value).toLowerCase();
}

export function createUserHandleCandidate(value: string, fallback = "member") {
  const candidate = stripUserHandlePrefix(value || fallback)
    .toLowerCase()
    .replace(/[^a-z0-9._]+/g, "_")
    .replace(/^[^a-z0-9_]+/, "")
    .replace(/[^a-z0-9_]+$/, "")
    .slice(0, userHandleMaxLength);

  return (candidate || fallback).padEnd(userHandleMinLength, "_").slice(0, userHandleMaxLength);
}

export function isValidUserHandle(value: string) {
  const handle = normalizeUserHandle(value);

  return (
    handle.length >= userHandleMinLength &&
    handle.length <= userHandleMaxLength &&
    userHandlePattern.test(handle)
  );
}

export function formatUserHandle(value: string) {
  const handle = normalizeUserHandle(value);

  return isValidUserHandle(handle) ? `@${handle}` : value.trim();
}

export function getUserProfilePath(userId: string, userName?: string | null) {
  const handle = userName ? normalizeUserHandle(userName) : "";

  return handle && isValidUserHandle(handle)
    ? `/profile/${encodeURIComponent(handle)}`
    : `/profile/${encodeURIComponent(userId)}`;
}
