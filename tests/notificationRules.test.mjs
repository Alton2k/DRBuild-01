import assert from "node:assert/strict";
import test from "node:test";

import {
  canReadNotification,
  createNotificationDedupeKey,
  createNotificationStorageData,
  isNotificationEnabled,
} from "../lib/notificationRules.ts";

test("notification delivery follows the matching preference and safe defaults", () => {
  assert.equal(isNotificationEnabled("new_comment", { newComments: false }), false);
  assert.equal(isNotificationEnabled("comment_reply", { commentReplies: true }), true);
  assert.equal(isNotificationEnabled("deal_approval", null), true);
  assert.equal(isNotificationEnabled("saved_deal_update", {}), true);
});

test("notification storage payload contains only schema fields", () => {
  const payload = createNotificationStorageData({
    type: "saved_deal_update",
    recipientUserId: "user-1",
    actorUserId: "user-2",
    dealDocumentId: "deal-1",
    eventVersion: "4",
    message: "A saved deal changed.",
  });

  assert.deepEqual(payload, {
    recipientUserId: "user-1",
    type: "saved_deal_update",
    actorUserId: "user-2",
    dealDocumentId: "deal-1",
    commentDocumentId: undefined,
    message: "A saved deal changed.",
    dedupeKey: "saved_deal_update:user-1:deal-1::4",
  });
  assert.equal("eventVersion" in payload, false);
});

test("only a notification recipient may read or mutate read state", () => {
  assert.equal(canReadNotification("user-1", "user-1"), true);
  assert.equal(canReadNotification("user-1", "user-2"), false);
  assert.equal(canReadNotification("", ""), false);
});

test("notification dedupe keys distinguish event type, recipient, entity, and version", () => {
  const base = createNotificationDedupeKey({
    type: "saved_deal_update",
    recipientUserId: "user-1",
    dealDocumentId: "deal-1",
    eventVersion: "4",
  });

  assert.equal(base, createNotificationDedupeKey({ type: "saved_deal_update", recipientUserId: "user-1", dealDocumentId: "deal-1", eventVersion: "4" }));
  assert.notEqual(base, createNotificationDedupeKey({ type: "saved_deal_update", recipientUserId: "user-2", dealDocumentId: "deal-1", eventVersion: "4" }));
  assert.notEqual(base, createNotificationDedupeKey({ type: "saved_deal_update", recipientUserId: "user-1", dealDocumentId: "deal-1", eventVersion: "5" }));
});
