import { NextResponse, type NextRequest } from "next/server";
import {
  createSiteAccessToken,
  getSafeSiteAccessNext,
  getSiteAccessSettings,
  isSiteAccessRequestSameOrigin,
  matchesSiteAccessPin,
  SITE_ACCESS_COOKIE,
  SITE_ACCESS_MAXIMUM_CODE_LENGTH,
  SITE_ACCESS_SESSION_SECONDS,
} from "@/lib/siteAccess";

const invalidCodeDelayMs = 900;
const maximumRequestBytes = 4096;

function withPrivateHeaders(response: NextResponse) {
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  return response;
}

function accessPageRedirect(request: NextRequest, next: string, error: "invalid" | "unavailable") {
  const url = new URL("/site-access", request.url);
  url.searchParams.set("next", getSafeSiteAccessNext(next));
  url.searchParams.set("error", error);
  return withPrivateHeaders(NextResponse.redirect(url, 303));
}

function isSameOriginBrowserRequest(request: NextRequest) {
  return isSiteAccessRequestSameOrigin({
    fetchSite: request.headers.get("sec-fetch-site"),
    forwardedHost: request.headers.get("x-forwarded-host"),
    host: request.headers.get("host"),
    origin: request.headers.get("origin"),
    referer: request.headers.get("referer"),
    urlHost: request.nextUrl.host,
  });
}

export async function POST(request: NextRequest) {
  if (!isSameOriginBrowserRequest(request)) {
    return withPrivateHeaders(new NextResponse(null, { status: 403 }));
  }

  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  const contentLengthHeader = request.headers.get("content-length");
  const contentLength = Number(contentLengthHeader);
  if (
    !contentType.startsWith("application/x-www-form-urlencoded")
    || !contentLengthHeader
    || !Number.isFinite(contentLength)
    || contentLength <= 0
    || contentLength > maximumRequestBytes
  ) {
    return withPrivateHeaders(new NextResponse(null, { status: 415 }));
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return withPrivateHeaders(new NextResponse(null, { status: 400 }));
  }

  const next = getSafeSiteAccessNext(String(formData.get("next") ?? "/"));
  const submittedCode = String(formData.get("accessCode") ?? "");
  const settings = getSiteAccessSettings();

  if (!settings.enabled || !settings.configured) {
    return accessPageRedirect(request, next, "unavailable");
  }

  if (
    !submittedCode
    || submittedCode.length > SITE_ACCESS_MAXIMUM_CODE_LENGTH
    || !(await matchesSiteAccessPin(submittedCode, settings.pin))
  ) {
    await new Promise((resolve) => setTimeout(resolve, invalidCodeDelayMs));
    return accessPageRedirect(request, next, "invalid");
  }

  const response = NextResponse.redirect(new URL(next, request.url), 303);
  response.cookies.set(SITE_ACCESS_COOKIE, await createSiteAccessToken(settings.secret), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SITE_ACCESS_SESSION_SECONDS,
    priority: "high",
  });
  return withPrivateHeaders(response);
}
