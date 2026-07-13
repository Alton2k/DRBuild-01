import "server-only";

import {
  decodeDealImageDataUrl,
  getDealImageFileName,
  type StoredDealMediaFile,
} from "./dealImageData";
import { getStrapiAccessHeaders, getStrapiToken, getStrapiUrl } from "./strapi";

type StrapiUploadFile = {
  id: number;
  name: string;
  url: string;
};

export type PreparedDealMedia = {
  urls: string[];
  uploadedFiles: StoredDealMediaFile[];
};

export class DealMediaUploadError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "DealMediaUploadError";
  }
}

function getRequiredStrapiToken() {
  const token = getStrapiToken();
  if (!token) {
    throw new DealMediaUploadError("Media upload is not configured.");
  }
  return token;
}

function getAbsoluteMediaUrl(value: string) {
  try {
    const url = new URL(value, getStrapiUrl());
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

async function uploadDealImage(dataUrl: string, fileName: string, index: number) {
  const image = decodeDealImageDataUrl(dataUrl);
  if (!image) {
    throw new DealMediaUploadError("One of the selected images is invalid or too large.", 400);
  }

  const buffer = new ArrayBuffer(image.bytes.byteLength);
  new Uint8Array(buffer).set(image.bytes);
  const formData = new FormData();
  formData.append(
    "files",
    new Blob([buffer], { type: image.mime }),
    getDealImageFileName(fileName, index, image.extension),
  );

  const response = await fetch(`${getStrapiUrl()}/api/upload`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${getRequiredStrapiToken()}`,
      ...getStrapiAccessHeaders(),
    },
    body: formData,
    cache: "no-store",
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    const message = typeof errorBody?.error?.message === "string"
      ? errorBody.error.message
      : `Strapi upload failed with ${response.status}`;
    throw new DealMediaUploadError(message, response.status);
  }

  const files = await response.json() as StrapiUploadFile[];
  const file = files[0];
  const url = file ? getAbsoluteMediaUrl(file.url) : "";
  if (!file || !Number.isSafeInteger(file.id) || !url) {
    throw new DealMediaUploadError("Strapi did not return the uploaded image.");
  }

  return { id: file.id, url };
}

export async function deleteUploadedDealMedia(fileIds: number[]) {
  if (fileIds.length === 0) {
    return;
  }

  const token = getRequiredStrapiToken();
  await Promise.allSettled(
    fileIds.map((id) => fetch(`${getStrapiUrl()}/api/upload/files/${id}`, {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        ...getStrapiAccessHeaders(),
      },
      cache: "no-store",
    })),
  );
}

export async function prepareDealMediaUrls(
  values: string[],
  fileNames: string[] = [],
): Promise<PreparedDealMedia> {
  const urls: string[] = [];
  const uploadedFiles: StoredDealMediaFile[] = [];

  try {
    for (const [index, value] of values.entries()) {
      if (!value.startsWith("data:image/")) {
        urls.push(value);
        continue;
      }

      const uploaded = await uploadDealImage(value, fileNames[index] ?? "", index);
      urls.push(uploaded.url);
      uploadedFiles.push(uploaded);
    }
  } catch (error) {
    await deleteUploadedDealMedia(uploadedFiles.map((file) => file.id));
    if (error instanceof DealMediaUploadError) {
      throw error;
    }
    throw new DealMediaUploadError("Could not upload the selected images.");
  }

  return { urls, uploadedFiles };
}

export function getDealMediaUploadMessage(error: unknown) {
  if (error instanceof DealMediaUploadError && (error.status === 401 || error.status === 403)) {
    return "Image upload is not permitted by the production Strapi API token.";
  }
  if (error instanceof DealMediaUploadError && error.status === 413) {
    return "One of the selected images is too large to upload.";
  }
  if (error instanceof DealMediaUploadError && error.status === 400) {
    return error.message;
  }
  return "Could not upload the selected images. Please try again.";
}
