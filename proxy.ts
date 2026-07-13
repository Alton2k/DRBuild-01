import { NextResponse, type NextRequest } from "next/server";
import {
  getSafeSiteAccessNext,
  getSiteAccessSettings,
  SITE_ACCESS_COOKIE,
  verifySiteAccessToken,
} from "./lib/siteAccess";

const accessPagePath = "/site-access";
const accessPageHeader = "x-deal-rakyat-site-access-page";

function withPrivateSiteHeaders(response: NextResponse) {
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  return response;
}

function continueRequest(request: NextRequest, isAccessPage = false) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete(accessPageHeader);
  if (isAccessPage) {
    requestHeaders.set(accessPageHeader, "1");
  }

  return withPrivateSiteHeaders(
    NextResponse.next({
      request: { headers: requestHeaders },
    }),
  );
}

export async function proxy(request: NextRequest) {
  const settings = getSiteAccessSettings();
  if (!settings.enabled) {
    return NextResponse.next();
  }

  const { pathname, search } = request.nextUrl;
  if (pathname === accessPagePath) {
    return continueRequest(request, true);
  }

  if (pathname === "/api/health" || pathname === "/robots.txt") {
    return continueRequest(request);
  }

  const token = request.cookies.get(SITE_ACCESS_COOKIE)?.value;
  if (settings.configured && (await verifySiteAccessToken(token, settings.secret))) {
    return continueRequest(request);
  }

  if (pathname.startsWith("/api/")) {
    return withPrivateSiteHeaders(
      NextResponse.json(
        { error: { message: "Development access is required." } },
        { status: 401 },
      ),
    );
  }

  const accessUrl = new URL(accessPagePath, request.url);
  accessUrl.searchParams.set("next", getSafeSiteAccessNext(`${pathname}${search}`));
  return withPrivateSiteHeaders(NextResponse.redirect(accessUrl));
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|apple-icon.png|icon.svg|icon1.png|deal-rakyat-og.svg).*)",
  ],
};
