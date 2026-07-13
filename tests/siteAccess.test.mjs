import assert from "node:assert/strict";
import test from "node:test";

import {
  createSiteAccessToken,
  getSafeSiteAccessNext,
  getSiteAccessSettings,
  isSiteAccessRequestSameOrigin,
  matchesSiteAccessPin,
  verifySiteAccessToken,
} from "../lib/siteAccess.ts";
import {
  getSiteAccessPageError,
  renderSiteAccessPage,
} from "../lib/siteAccessGate.ts";

const secret = "development-preview-secret-with-32-characters";

test("enables the gate only when a code exists and requires a strong signing secret", () => {
  assert.deepEqual(getSiteAccessSettings({ SITE_ACCESS_PIN: "", SITE_ACCESS_SECRET: "" }), {
    enabled: false,
    configured: false,
    pin: "",
    secret: "",
  });
  assert.equal(getSiteAccessSettings({ SITE_ACCESS_PIN: "short-code", SITE_ACCESS_SECRET: secret }).configured, false);
  assert.equal(getSiteAccessSettings({ SITE_ACCESS_PIN: "private-code", SITE_ACCESS_SECRET: "short" }).configured, false);
  assert.equal(getSiteAccessSettings({ SITE_ACCESS_PIN: " private-code-4827 ", SITE_ACCESS_SECRET: secret }).configured, true);
});

test("creates a signed token that expires and rejects tampering", async () => {
  const now = 1_750_000_000_000;
  const token = await createSiteAccessToken(secret, now, 900);

  assert.equal(await verifySiteAccessToken(token, secret, now + 899_000), true);
  assert.equal(await verifySiteAccessToken(token, secret, now + 900_000), false);
  assert.equal(await verifySiteAccessToken(`${token}changed`, secret, now), false);
  assert.equal(await verifySiteAccessToken(token, `${secret}-wrong`, now), false);
});

test("compares the submitted access code without normalizing its value", async () => {
  assert.equal(await matchesSiteAccessPin("P1n with spaces", "P1n with spaces"), true);
  assert.equal(await matchesSiteAccessPin("P1n with spaces ", "P1n with spaces"), false);
});

test("allows only local return paths outside the access screen", () => {
  assert.equal(getSafeSiteAccessNext("/deal/example?ref=preview"), "/deal/example?ref=preview");
  assert.equal(getSafeSiteAccessNext("https://example.com"), "/");
  assert.equal(getSafeSiteAccessNext("//example.com"), "/");
  assert.equal(getSafeSiteAccessNext("/site-access?next=/admin"), "/");
});

test("renders a JavaScript-free generic gate and escapes the return path", () => {
  const html = renderSiteAccessPage({
    next: "/deal?value=\"><script>leak()</script>",
    error: null,
    configured: true,
  });

  assert.match(html, /This site is under development/);
  assert.match(html, /value=&quot;&gt;&lt;script&gt;leak\(\)&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script/i);
  assert.doesNotMatch(html, /Deal Rakyat|_next\/|SITE_ACCESS|development-preview-secret/i);
});

test("accepts only fixed gate error values", () => {
  assert.equal(getSiteAccessPageError("invalid"), "invalid");
  assert.equal(getSiteAccessPageError("unavailable"), "unavailable");
  assert.equal(getSiteAccessPageError("<script>"), null);
});

test("accepts localhost browser origins across Next host representations", () => {
  assert.equal(isSiteAccessRequestSameOrigin({
    fetchSite: "same-origin",
    forwardedHost: "127.0.0.1:3000",
    host: "localhost:3000",
    origin: "http://localhost:3000",
    referer: null,
    urlHost: "localhost:3000",
  }), true);

  assert.equal(isSiteAccessRequestSameOrigin({
    fetchSite: "same-origin",
    forwardedHost: null,
    host: "localhost:3000",
    origin: null,
    referer: "http://localhost:3000/site-access?next=%2F",
    urlHost: "localhost:3000",
  }), true);
});

test("rejects cross-site and mismatched gate submissions", () => {
  const request = {
    forwardedHost: null,
    host: "localhost:3000",
    referer: null,
    urlHost: "localhost:3000",
  };

  assert.equal(isSiteAccessRequestSameOrigin({
    ...request,
    fetchSite: "cross-site",
    origin: "http://localhost:3000",
  }), false);
  assert.equal(isSiteAccessRequestSameOrigin({
    ...request,
    fetchSite: "same-origin",
    origin: "https://evil.example",
  }), false);
});
