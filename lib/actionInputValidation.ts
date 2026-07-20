export const allowedModerationStatuses = ["pending", "approved", "rejected"] as const;

const allowedModerationStatusSet = new Set<string>(allowedModerationStatuses);
const actionIdPattern = /^[a-zA-Z0-9_-]{1,128}$/;

export function isValidActionId(value: string | undefined | null): value is string {
  return Boolean(value && actionIdPattern.test(value));
}

export function isDealStatus(value: string): value is (typeof allowedModerationStatuses)[number] {
  return allowedModerationStatusSet.has(value);
}
