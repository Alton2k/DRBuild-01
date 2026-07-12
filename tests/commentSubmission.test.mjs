import assert from "node:assert/strict";
import test from "node:test";
import { createCommentSubmissionKey, resolveCreatedCommentDealId } from "../lib/commentSubmission.ts";

test("creates the same key for concurrent authenticated submissions", () => {
  const first = createCommentSubmissionKey({ dealId: "deal-1", body: "Useful comment", authorUserId: "user-1", authorViewerId: "viewer-a" });
  const second = createCommentSubmissionKey({ dealId: "deal-1", body: "Useful comment", authorUserId: "user-1", authorViewerId: "viewer-b" });
  assert.equal(first, second);
  assert.equal(first?.length, 64);
});

test("separates different users, deals, and comment bodies", () => {
  const base = createCommentSubmissionKey({ dealId: "deal-1", body: "Useful comment", authorUserId: "user-1" });
  assert.notEqual(base, createCommentSubmissionKey({ dealId: "deal-1", body: "Useful comment", authorUserId: "user-2" }));
  assert.notEqual(base, createCommentSubmissionKey({ dealId: "deal-2", body: "Useful comment", authorUserId: "user-1" }));
  assert.notEqual(base, createCommentSubmissionKey({ dealId: "deal-1", body: "Different comment", authorUserId: "user-1" }));
});

test("uses anonymous viewer identity when no account exists", () => {
  assert.notEqual(
    createCommentSubmissionKey({ dealId: "deal-1", body: "Useful comment", authorViewerId: "viewer-a" }),
    createCommentSubmissionKey({ dealId: "deal-1", body: "Useful comment", authorViewerId: "viewer-b" }),
  );
});

test("uses the submitted deal id when a create response omits its relation", () => {
  assert.equal(resolveCreatedCommentDealId(undefined, "deal-submitted"), "deal-submitted");
  assert.equal(resolveCreatedCommentDealId({}, "deal-submitted"), "deal-submitted");
  assert.equal(resolveCreatedCommentDealId({ documentId: "deal-populated" }, "deal-submitted"), "deal-populated");
  assert.equal(resolveCreatedCommentDealId({ id: 42 }, "deal-submitted"), "42");
});
