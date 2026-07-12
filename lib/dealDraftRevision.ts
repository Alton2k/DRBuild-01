export function isStoredDealDraftCurrent(
  mode: "create" | "edit",
  currentRevision: string,
  storedRevision: string | undefined,
) {
  if (mode === "create") return true;
  return Boolean(currentRevision && storedRevision === currentRevision);
}
