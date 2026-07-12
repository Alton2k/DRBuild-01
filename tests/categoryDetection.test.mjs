import assert from "node:assert/strict";
import test from "node:test";

import { getInitialCategoryTouched } from "../lib/dealFormCategory.ts";

test("preserves the stored category while editing a deal", () => {
  assert.equal(getInitialCategoryTouched("edit", "Home & Living"), true);
  assert.equal(getInitialCategoryTouched("edit", ""), true);
});

test("allows detection for a new uncategorized deal", () => {
  assert.equal(getInitialCategoryTouched("create", ""), false);
});

test("preserves an explicitly initialized create category", () => {
  assert.equal(getInitialCategoryTouched("create", "Electronics"), true);
});
