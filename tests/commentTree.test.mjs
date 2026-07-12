import assert from "node:assert/strict";
import test from "node:test";
import { getCommentTreeDeleteOrder } from "../lib/commentTree.ts";

test("orders descendants before their parent for safe deletion", () => {
  const order = getCommentTreeDeleteOrder("root", [
    { id: "root", parentId: null },
    { id: "reply-a", parentId: "root" },
    { id: "reply-b", parentId: "root" },
    { id: "nested", parentId: "reply-a" },
  ]);
  assert.deepEqual(order, ["nested", "reply-a", "reply-b", "root"]);
});

test("does not include unrelated comments", () => {
  assert.deepEqual(getCommentTreeDeleteOrder("root", [
    { id: "root", parentId: null },
    { id: "other", parentId: null },
    { id: "other-reply", parentId: "other" },
  ]), ["root"]);
});

test("handles corrupt cycles without repeating or recursing forever", () => {
  const order = getCommentTreeDeleteOrder("a", [
    { id: "a", parentId: "b" },
    { id: "b", parentId: "a" },
  ]);
  assert.deepEqual(order, ["b", "a"]);
});
