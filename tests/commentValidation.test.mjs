import assert from "node:assert/strict";
import test from "node:test";
import { commentMaxLength, validateCommentBody } from "../lib/commentValidation.ts";

test("trims a valid comment before saving", () => {
  assert.deepEqual(validateCommentBody("  Helpful price note  "), { ok: true, body: "Helpful price note" });
});

test("rejects comments below the minimum length", () => {
  assert.equal(validateCommentBody("ok").ok, false);
  assert.equal(validateCommentBody("ok").message, "Your comment is too short.");
});

test("accepts exactly the maximum length and rejects one character more", () => {
  const maximumLengthComment = "Helpful deal note. ".repeat(100).slice(0, commentMaxLength);
  assert.equal(maximumLengthComment.length, commentMaxLength);
  assert.equal(validateCommentBody(maximumLengthComment).ok, true);
  assert.equal(validateCommentBody(`${maximumLengthComment}x`).message, "Your comment is too long.");
});

test("rejects repetitive low-information comments", () => {
  assert.equal(validateCommentBody("ha ha ha ha ha").message, "Please write a more detailed comment.");
});
