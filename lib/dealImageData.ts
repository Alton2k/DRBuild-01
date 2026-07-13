export const maximumDealImageBytes = 1_500_000;

const supportedImageDataUrlPattern = /^data:image\/(png|jpeg|jpg|webp|gif|avif);base64,([a-z0-9+/=]+)$/i;

const mimeTypes: Record<string, { extension: string; mime: string }> = {
  avif: { extension: "avif", mime: "image/avif" },
  gif: { extension: "gif", mime: "image/gif" },
  jpeg: { extension: "jpg", mime: "image/jpeg" },
  jpg: { extension: "jpg", mime: "image/jpeg" },
  png: { extension: "png", mime: "image/png" },
  webp: { extension: "webp", mime: "image/webp" },
};

export type DealImageData = {
  bytes: Uint8Array;
  extension: string;
  mime: string;
};

export type StoredDealMediaFile = {
  id: number;
  url: string;
};

export function isDealImageDataUrl(value: string) {
  return supportedImageDataUrlPattern.test(value);
}

export function decodeDealImageDataUrl(value: string): DealImageData | null {
  const match = supportedImageDataUrlPattern.exec(value);
  if (!match) {
    return null;
  }

  const type = mimeTypes[match[1].toLowerCase()];
  if (!type) {
    return null;
  }

  try {
    const binary = atob(match[2]);
    if (!binary.length || binary.length > maximumDealImageBytes) {
      return null;
    }

    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return { ...type, bytes };
  } catch {
    return null;
  }
}

export function getDealImageFileName(value: string, index: number, extension: string) {
  const withoutExtension = value.replace(/\.[a-z0-9]{1,8}$/i, "");
  const base = withoutExtension
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 60);

  return `${base || `deal-image-${index + 1}`}-${crypto.randomUUID().slice(0, 8)}.${extension}`;
}

export function getDealMediaChanges(
  existingFiles: StoredDealMediaFile[],
  nextUrls: string[],
  uploadedFiles: StoredDealMediaFile[],
) {
  const nextUrlSet = new Set(nextUrls);
  const retainedFiles = existingFiles.filter((file) => nextUrlSet.has(file.url));
  const removedFileIds = existingFiles
    .filter((file) => !nextUrlSet.has(file.url))
    .map((file) => file.id);

  return {
    storedFiles: [...retainedFiles, ...uploadedFiles],
    removedFileIds,
  };
}
