export const siteName = "Deal Rakyat";
export const siteDescription =
  "Discover Malaysia-focused community deals, vouchers, price drops, and shopping tips shared by real people.";

export function getSiteUrl() {
  const rawUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";

  try {
    return new URL(rawUrl);
  } catch {
    return new URL("http://localhost:3000");
  }
}

export function getAbsoluteUrl(path = "/") {
  return new URL(path, getSiteUrl()).toString();
}
