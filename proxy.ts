import { NextResponse, type NextRequest } from "next/server";
import {
  getSafeSiteAccessNext,
  getSiteAccessSettings,
  SITE_ACCESS_COOKIE,
  verifySiteAccessToken,
} from "./lib/siteAccess";
import { getSiteAccessPageError, renderSiteAccessPage } from "./lib/siteAccessGate";

const accessPagePath = "/site-access";

function withPrivateSiteHeaders(response: NextResponse, includeContentSecurityPolicy = false) {
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  if (includeContentSecurityPolicy) {
    response.headers.set(
      "Content-Security-Policy",
      "default-src 'none'; style-src 'unsafe-inline'; img-src data:; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
    );
  }
  return response;
}

function continueRequest(request: NextRequest) {
  return withPrivateSiteHeaders(
    NextResponse.next({
      request: { headers: new Headers(request.headers) },
    }),
  );
}

function siteAccessPage(request: NextRequest, configured: boolean) {
  const next = getSafeSiteAccessNext(request.nextUrl.searchParams.get("next"));
  const error = getSiteAccessPageError(request.nextUrl.searchParams.get("error"));
  return withPrivateSiteHeaders(
    new NextResponse(renderSiteAccessPage({ next, error, configured }), {
      status: configured ? 200 : 503,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    }),
    true,
  );
}

export async function proxy(request: NextRequest) {
  const settings = getSiteAccessSettings();
  if (!settings.enabled) {
    return NextResponse.next();
  }

  const { pathname, search } = request.nextUrl;
  if (pathname === "/robots.txt") {
    return continueRequest(request);
  }

  if (pathname === "/api/site-access") {
    return NextResponse.next();
  }

  const token = request.cookies.get(SITE_ACCESS_COOKIE)?.value;
  if (settings.configured && (await verifySiteAccessToken(token, settings.secret))) {
    if (pathname === accessPagePath) {
      return withPrivateSiteHeaders(
        NextResponse.redirect(new URL(getSafeSiteAccessNext(request.nextUrl.searchParams.get("next")), request.url)),
      );
    }
    return continueRequest(request);
  }

  if (pathname === accessPagePath) {
    return siteAccessPage(request, settings.configured);
  }

  if (pathname.startsWith("/api/")) {
    return withPrivateSiteHeaders(
      NextResponse.json(
        { error: { message: "Not found." } },
        { status: 401 },
      ),
    );
  }

  if (pathname.startsWith("/_next/") || pathname === "/favicon.ico") {
    return withPrivateSiteHeaders(new NextResponse(null, { status: 404 }));
  }

  const accessUrl = new URL(accessPagePath, request.url);
  accessUrl.searchParams.set("next", getSafeSiteAccessNext(`${pathname}${search}`));
  return withPrivateSiteHeaders(NextResponse.redirect(accessUrl));
}

export const config = {
  matcher: ["/:path*"],
};
