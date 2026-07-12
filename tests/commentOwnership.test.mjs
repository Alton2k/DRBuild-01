import assert from "node:assert/strict";
import test from "node:test";
import { isCommentOwnedBy } from "../lib/commentOwnership.ts";

const comment = { authorViewerId: "viewer-owner", authorUserId: "user-owner" };

test("recognizes the authenticated comment owner", () => {
  assert.equal(isCommentOwnedBy(comment, { authorUserId: "user-owner" }), true);
});

test("recognizes the anonymous viewer that authored a comment", () => {
  assert.equal(isCommentOwnedBy(comment, { viewerId: "viewer-owner" }), true);
});

test("rejects unrelated and missing identities", () => {
  assert.equal(isCommentOwnedBy(comment, { viewerId: "other", authorUserId: "other" }), false);
  assert.equal(isCommentOwnedBy(comment, {}), false);
});

test("does not treat empty identifiers as ownership", () => {
  assert.equal(isCommentOwnedBy({ authorViewerId: "", authorUserId: "" }, { viewerId: "", authorUserId: "" }), false);
});
