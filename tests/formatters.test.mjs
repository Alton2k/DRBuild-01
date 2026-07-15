import assert from "node:assert/strict";
import test from "node:test";

import { formatMalaysiaDateTime } from "../lib/formatters.ts";

test("formats timestamps deterministically in Malaysia time", () => {
  assert.equal(formatMalaysiaDateTime("2026-07-14T18:39:00.000Z"), "15 Jul 2026, 02:39 am");
  assert.equal(formatMalaysiaDateTime("2026-07-15T04:05:00.000Z"), "15 Jul 2026, 12:05 pm");
});

test("returns a stable fallback for invalid timestamps", () => {
  assert.equal(formatMalaysiaDateTime("not-a-date"), "Unknown");
});
