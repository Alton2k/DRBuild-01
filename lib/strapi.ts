import "server-only";

type StrapiRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  query?: URLSearchParams;
  body?: unknown;
  requireToken?: boolean;
};

export type StrapiEntity<T> = T & {
  id: number;
  documentId?: string;
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string | null;
  attributes?: T;
};

export type StrapiListResponse<T> = {
  data: Array<StrapiEntity<T>>;
  meta?: unknown;
};

export type StrapiSingleResponse<T> = {
  data: StrapiEntity<T> | null;
  meta?: unknown;
};

const defaultStrapiUrl = "http://127.0.0.1:1337";

export function getStrapiUrl() {
  return (process.env.STRAPI_URL ?? defaultStrapiUrl).replace(/\/+$/, "");
}

export function getStrapiToken() {
  return process.env.STRAPI_API_TOKEN ?? "";
}

export function getStrapiEntityFields<T extends object>(entity: StrapiEntity<T>): T {
  return entity.attributes ?? entity;
}

export function getStrapiEntityId<T extends object>(entity: StrapiEntity<T>) {
  return entity.documentId ?? String(entity.id);
}

export async function strapiRequest<T>(path: string, options: StrapiRequestOptions = {}) {
  const url = new URL(`${getStrapiUrl()}${path.startsWith("/") ? path : `/${path}`}`);

  if (options.query) {
    for (const [key, value] of options.query) {
      url.searchParams.append(key, value);
    }
  }

  const token = getStrapiToken();
  const headers: HeadersInit = {
    Accept: "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  } else if (options.requireToken) {
    throw new Error("Missing STRAPI_API_TOKEN. Create an API token in Strapi and add it to .env.local.");
  }

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: "no-store",
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    const message =
      typeof errorBody?.error?.message === "string"
        ? errorBody.error.message
        : `Strapi request failed with ${response.status}`;

    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const responseText = await response.text();

  if (!responseText) {
    return undefined as T;
  }

  return JSON.parse(responseText) as T;
}
