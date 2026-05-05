import { isIP } from "node:net";
import { type NextRequest, NextResponse } from "next/server";
import { chromium } from "playwright";

export const runtime = "nodejs";

const MAX_URL_LENGTH = 2048;
const BROWSER_LAUNCH_TIMEOUT_MS = 8_000;
const NAVIGATION_TIMEOUT_MS = 12_000;
const CONTENT_TIMEOUT_MS = 7_000;
const CACHE_TTL_MS = 30 * 60 * 1000;
const MAX_CACHE_ENTRIES = 100;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 8;
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

type ScrapedMetadata = {
  title: string;
  image: string;
  description: string;
  store?: string;
  price?: string;
};

type UrlValidationResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

type CachedMetadata = {
  data: ScrapedMetadata;
  expiresAt: number;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const metadataCache = new Map<string, CachedMetadata>();
const rateLimitByClient = new Map<string, RateLimitEntry>();

function isPrivateIpv4(hostname: string) {
  const parts = hostname.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) {
    return false;
  }

  const [first, second] = parts;
  return (
    first === 10 ||
    first === 127 ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 169 && second === 254) ||
    first === 0
  );
}

/**
 * Narrows an unknown value to a bounded, public HTTP(S) URL string.
 */
function validateUrl(value: unknown): UrlValidationResult {
  if (typeof value !== "string") return { ok: false, error: "Invalid or missing URL" };

  const trimmed = value.trim();
  if (!trimmed) return { ok: false, error: "Invalid or missing URL" };
  if (trimmed.length > MAX_URL_LENGTH) return { ok: false, error: "URL is too long" };

  try {
    const parsed = new URL(trimmed);
    const hostname = parsed.hostname.toLowerCase();

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { ok: false, error: "URL must start with http:// or https://" };
    }

    if (parsed.username || parsed.password) {
      return { ok: false, error: "URL credentials are not supported" };
    }

    if (
      hostname === "localhost" ||
      hostname.endsWith(".localhost") ||
      hostname.endsWith(".local") ||
      isPrivateIpv4(hostname) ||
      isIP(hostname) === 6
    ) {
      return { ok: false, error: "Private or local URLs cannot be scraped" };
    }

    return { ok: true, url: parsed.toString() };
  } catch {
    return { ok: false, error: "Invalid or missing URL" };
  }
}

/**
 * Infers a known marketplace name from the URL when page metadata is incomplete.
 */
function getFallbackDomain(url: string) {
  const hostname = new URL(url).hostname.replace(/^www\./, "");
  const normalized = hostname.toLowerCase();

  if (normalized.includes("shopee")) return "Shopee";
  if (normalized.includes("lazada")) return "Lazada";
  if (normalized.includes("amazon")) return "Amazon";

  return hostname.split(".").at(-2) ?? hostname;
}

function cleanText(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function normalizeImageUrl(value: string, baseUrl: string) {
  if (!value) return "";

  try {
    const parsed = value.startsWith("//")
      ? new URL(`https:${value}`)
      : new URL(value, baseUrl);

    return parsed.protocol === "http:" || parsed.protocol === "https:"
      ? parsed.toString()
      : "";
  } catch {
    return "";
  }
}

function hasMetadata(data: ScrapedMetadata) {
  return Boolean(data.image || data.price || data.store);
}

function getClientKey(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();

  return forwardedFor || realIp || "local";
}

function checkRateLimit(clientKey: string) {
  const now = Date.now();
  const current = rateLimitByClient.get(clientKey);

  if (!current || current.resetAt <= now) {
    rateLimitByClient.set(clientKey, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (current.count >= MAX_REQUESTS_PER_WINDOW) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  current.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

function getCachedMetadata(url: string) {
  const cached = metadataCache.get(url);

  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    metadataCache.delete(url);
    return null;
  }

  return cached.data;
}

function cacheMetadata(url: string, metadata: ScrapedMetadata) {
  if (!hasMetadata(metadata)) return;

  metadataCache.set(url, {
    data: metadata,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  if (metadataCache.size <= MAX_CACHE_ENTRIES) return;

  const oldestKey = metadataCache.keys().next().value;
  if (oldestKey) metadataCache.delete(oldestKey);
}

function metadataResponse(metadata: ScrapedMetadata) {
  return NextResponse.json({
    title: "",
    image: metadata.image,
    description: "",
    ...(metadata.store ? { store: metadata.store } : {}),
    ...(metadata.price ? { price: metadata.price } : {}),
  });
}

async function extractWithPlaywright(url: string): Promise<ScrapedMetadata> {
  const browser = await chromium.launch({
    headless: true,
    timeout: BROWSER_LAUNCH_TIMEOUT_MS,
  });

  try {
    const context = await browser.newContext({
      userAgent: USER_AGENT,
      viewport: { width: 1366, height: 900 },
      locale: "en-MY",
      timezoneId: "Asia/Kuala_Lumpur",
      extraHTTPHeaders: {
        "Accept-Language": "en-MY,en;q=0.9,ms;q=0.8",
      },
    });

    const page = await context.newPage();
    page.setDefaultTimeout(CONTENT_TIMEOUT_MS);
    page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT_MS);

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: NAVIGATION_TIMEOUT_MS });
    await page.waitForLoadState("networkidle", { timeout: 4_000 }).catch(() => undefined);
    await page
      .waitForFunction(
        () =>
          Boolean(
            document.querySelector(
              'meta[property="og:title"], meta[name="description"], script[type="application/ld+json"], h1',
            ),
          ) || document.body.innerText.trim().length > 500,
        undefined,
        { timeout: CONTENT_TIMEOUT_MS },
      )
      .catch(() => undefined);

    const extracted = await page.evaluate(() => {
      type Candidate = {
        title?: string;
        image?: string;
        description?: string;
        store?: string;
        price?: string;
      };

      const clean = (value: unknown) =>
        typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";

      const meta = (...selectors: string[]) => {
        for (const selector of selectors) {
          const value = document.querySelector<HTMLMetaElement>(selector)?.content;
          if (clean(value)) return clean(value);
        }
        return "";
      };

      const getJsonLdCandidates = () => {
        const candidates: Candidate[] = [];
        const scripts = Array.from(document.querySelectorAll<HTMLScriptElement>('script[type="application/ld+json"]'));

        const visit = (value: unknown) => {
          if (!value || typeof value !== "object") return;
          if (Array.isArray(value)) {
            value.forEach(visit);
            return;
          }

          const record = value as Record<string, unknown>;
          const type = Array.isArray(record["@type"]) ? record["@type"].join(" ") : clean(record["@type"]);

          if (type.toLowerCase().includes("product") || record.offers) {
            const offer = Array.isArray(record.offers) ? record.offers[0] : record.offers;
            const offerRecord =
              offer && typeof offer === "object" ? (offer as Record<string, unknown>) : undefined;
            const brand =
              typeof record.brand === "object" && record.brand
                ? clean((record.brand as Record<string, unknown>).name)
                : clean(record.brand);
            const image = Array.isArray(record.image) ? clean(record.image[0]) : clean(record.image);

            candidates.push({
              title: clean(record.name),
              image,
              description: clean(record.description),
              store: brand,
              price: clean(offerRecord?.price) || clean(offerRecord?.lowPrice),
            });
          }

          visit(record["@graph"]);
        };

        scripts.forEach((script) => {
          try {
            visit(JSON.parse(script.textContent ?? ""));
          } catch {
            // Ignore malformed third-party JSON-LD blocks.
          }
        });

        return candidates;
      };

      const visibleText = (selector: string) =>
        clean(document.querySelector<HTMLElement>(selector)?.innerText);

      const imageFromDom = () => {
        const images = Array.from(document.images)
          .filter((image) => image.currentSrc || image.src)
          .map((image) => ({
            src: image.currentSrc || image.src,
            score:
              (image.naturalWidth || 0) * (image.naturalHeight || 0) +
              (image.alt.toLowerCase().includes("product") ? 100_000 : 0),
          }))
          .sort((a, b) => b.score - a.score);

        return clean(images[0]?.src);
      };

      const priceFromDom = () => {
        const selectors = [
          '[itemprop="price"]',
          '[data-testid*="price" i]',
          '[class*="price" i]',
          '[id*="price" i]',
        ];

        for (const selector of selectors) {
          const value = visibleText(selector) || clean(document.querySelector<HTMLElement>(selector)?.getAttribute("content"));
          if (value && /(?:RM|MYR|\$|S\$|USD|\d+[.,]\d{2})/i.test(value)) return value;
        }

        return "";
      };

      const jsonLd = getJsonLdCandidates().find(
        (candidate) => candidate.title || candidate.image || candidate.description,
      );

      const openGraph: Candidate = {
        title: meta('meta[property="og:title"]', 'meta[name="twitter:title"]'),
        image: meta('meta[property="og:image"]', 'meta[name="twitter:image"]', 'meta[itemprop="image"]'),
        description: meta(
          'meta[property="og:description"]',
          'meta[name="twitter:description"]',
          'meta[name="description"]',
        ),
        store: meta('meta[property="og:site_name"]', 'meta[name="application-name"]'),
        price: meta(
          'meta[property="product:price:amount"]',
          'meta[property="og:price:amount"]',
          'meta[itemprop="price"]',
        ),
      };

      const dom: Candidate = {
        title:
          visibleText("h1") ||
          visibleText('[data-testid*="title" i]') ||
          visibleText('[class*="product-title" i]') ||
          clean(document.title),
        image: imageFromDom(),
        description:
          visibleText('[itemprop="description"]') ||
          visibleText('[data-testid*="description" i]') ||
          visibleText('[class*="description" i]'),
        price: priceFromDom(),
      };

      return {
        title: jsonLd?.title || openGraph.title || dom.title || "",
        image: jsonLd?.image || openGraph.image || dom.image || "",
        description: jsonLd?.description || openGraph.description || dom.description || "",
        store: jsonLd?.store || openGraph.store || "",
        price: jsonLd?.price || openGraph.price || dom.price || "",
      };
    });

    return {
      title: "",
      image: normalizeImageUrl(cleanText(extracted.image), url),
      description: "",
      store: cleanText(extracted.store),
      price: cleanText(extracted.price),
    };
  } finally {
    await browser.close();
  }
}

/**
 * Handles metadata scraping requests and returns title, image, and description JSON.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const validation = validateUrl(body?.url);

    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const cached = getCachedMetadata(validation.url);
    if (cached) {
      return metadataResponse(cached);
    }

    const rateLimit = checkRateLimit(getClientKey(request));
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error:
            "Autofill is temporarily rate limited. Please wait a few minutes or fill in the deal details manually.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfterSeconds),
          },
        },
      );
    }

    const metadata = await extractWithPlaywright(validation.url);

    if (hasMetadata(metadata)) {
      cacheMetadata(validation.url, metadata);
      return metadataResponse(metadata);
    }

    const fallbackDomain = getFallbackDomain(validation.url);
    return NextResponse.json(
      {
        error: `No product metadata was found on ${fallbackDomain}. The page may block automated browsers or require manual verification.`,
      },
      { status: 502 },
    );
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Failed to fetch product details";

    return NextResponse.json(
      {
        error: `${message}. Protected commerce pages may still block automated browsers; please fill in the deal details manually.`,
      },
      { status: message.toLowerCase().includes("timeout") ? 504 : 502 },
    );
  }
}
