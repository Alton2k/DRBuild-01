import assert from "node:assert/strict";
import test from "node:test";

import { isStoredDealDraftCurrent } from "../lib/dealDraftRevision.ts";

test("always permits create-mode drafts", () => {
  assert.equal(isStoredDealDraftCurrent("create", "", undefined), true);
});

test("restores an edit draft only for the current deal revision", () => {
  assert.equal(isStoredDealDraftCurrent("edit", "revision-2", "revision-2"), true);
  assert.equal(isStoredDealDraftCurrent("edit", "revision-2", "revision-1"), false);
});

test("rejects legacy or revisionless edit drafts", () => {
  assert.equal(isStoredDealDraftCurrent("edit", "revision-2", undefined), false);
  assert.equal(isStoredDealDraftCurrent("edit", "", "revision-2"), false);
});
