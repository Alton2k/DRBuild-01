import assert from "node:assert/strict";
import test from "node:test";

import {
  createSiteAccessToken,
  getSafeSiteAccessNext,
  getSiteAccessSettings,
  matchesSiteAccessPin,
  verifySiteAccessToken,
} from "../lib/siteAccess.ts";

const secret = "development-preview-secret-with-32-characters";

test("enables the gate only when a code exists and requires a strong signing secret", () => {
  assert.deepEqual(getSiteAccessSettings({ SITE_ACCESS_PIN: "", SITE_ACCESS_SECRET: "" }), {
    enabled: false,
    configured: false,
    pin: "",
    secret: "",
  });
  assert.equal(getSiteAccessSettings({ SITE_ACCESS_PIN: "private-code", SITE_ACCESS_SECRET: "short" }).configured, false);
  assert.equal(getSiteAccessSettings({ SITE_ACCESS_PIN: " private-code ", SITE_ACCESS_SECRET: secret }).configured, true);
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
