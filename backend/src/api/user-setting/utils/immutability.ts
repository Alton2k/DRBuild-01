export function normalizeImmutableHandle(value: unknown) {
  return typeof value === "string" ? value.trim().replace(/^@+/, "").toLocaleLowerCase() : "";
}

export function hasImmutableUserSettingChange(
  existing: { userId?: unknown; username?: unknown },
  patch: { userId?: unknown; username?: unknown },
) {
  const changesUserId =
    patch.userId !== undefined && String(patch.userId).trim() !== String(existing.userId ?? "").trim();
  const existingHandle = normalizeImmutableHandle(existing.username);
  const requestedHandle = normalizeImmutableHandle(patch.username);
  const changesHandle = patch.username !== undefined && Boolean(existingHandle) && requestedHandle !== existingHandle;

  return { changesUserId, changesHandle };
}
