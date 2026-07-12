export const dealDescriptionMinCharacters = 20;
export const dealDescriptionMaxCharacters = 10_000;
export const dealDescriptionMaxImages = 10;

export function getDealDescriptionValidationError(sanitizedHtml: string, text: string) {
  if (!text) return "Description is required.";
  if (text.length < dealDescriptionMinCharacters) return "Add a little more detail.";
  if (text.length > dealDescriptionMaxCharacters) return `Description must be ${dealDescriptionMaxCharacters.toLocaleString("en-MY")} characters or fewer.`;
  const imageCount = sanitizedHtml.match(/<img\b/gi)?.length ?? 0;
  if (imageCount > dealDescriptionMaxImages) return `Description can include up to ${dealDescriptionMaxImages} images.`;
  return "";
}
