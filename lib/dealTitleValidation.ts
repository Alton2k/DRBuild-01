export const dealTitleMaxCharacters = 90;
export const dealTitleMaxWords = 14;
export const dealTitleMaxWordCharacters = 32;

export function getDealTitleValidationError(value: string) {
  const title = value.trim();

  if (!title) {
    return "Deal title is required.";
  }

  if (title.length < 8) {
    return "Make the title more specific.";
  }

  if (title.length > dealTitleMaxCharacters) {
    return `Keep the title under ${dealTitleMaxCharacters} characters.`;
  }

  const words = title.split(/\s+/).filter(Boolean);

  if (words.length > dealTitleMaxWords) {
    return `Keep the title to ${dealTitleMaxWords} words or fewer.`;
  }

  if (words.some((word) => word.length > dealTitleMaxWordCharacters)) {
    return "Use shorter words in the title instead of pasted links.";
  }

  return "";
}
