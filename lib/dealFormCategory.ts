export function getInitialCategoryTouched(mode: "create" | "edit", category: string) {
  return mode === "edit" || Boolean(category.trim());
}
