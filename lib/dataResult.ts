import "server-only";

import { StrapiRequestError } from "./strapi";

export type DataResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status?: number };

type FetchContext = {
  functionName: string;
  endpoint: string;
  query?: URLSearchParams;
};

export function logDataFetchError(context: FetchContext, error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown data fetch error";
  const status = error instanceof StrapiRequestError ? error.status : undefined;

  console.error("[data-fetch]", {
    functionName: context.functionName,
    endpoint: context.endpoint,
    query: context.query?.toString() ?? "",
    status,
    message,
  });
}

export function dataFetchErrorResult<T>(context: FetchContext, error: unknown): DataResult<T> {
  logDataFetchError(context, error);

  if (error instanceof StrapiRequestError && error.status) {
    return {
      ok: false,
      error: "Data is temporarily unavailable.",
      status: error.status,
    };
  }

  return {
    ok: false,
    error: "Data is temporarily unavailable.",
  };
}
