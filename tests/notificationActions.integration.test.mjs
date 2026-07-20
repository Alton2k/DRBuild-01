import assert from "node:assert/strict";
import test from "node:test";

import {
  createNotificationActionOperations,
  createNotificationOperations,
} from "../lib/notificationOperations.ts";

function createNotification(id, recipientUserId, readAt = null) {
  return {
    id,
    recipientUserId,
    type: "new_comment",
    actorUserId: "actor-1",
    dealDocumentId: "deal-1",
    commentDocumentId: `comment-${id}`,
    message: "A member commented on your deal.",
    readAt,
    createdAt: "2026-07-21T00:00:00.000Z",
  };
}

function createDeliveryFixture(preferences = {}) {
  const rows = new Map();
  let nextId = 1;
  const calls = [];

  const repository = {
    async create(data) {
      calls.push(["create", data]);
      if (rows.has(data.dedupeKey)) {
        const error = new Error("duplicate dedupe key");
        error.code = "DUPLICATE";
        throw error;
      }

      const notification = {
        id: `notification-${nextId++}`,
        recipientUserId: data.recipientUserId,
        type: data.type,
        actorUserId: data.actorUserId ?? null,
        dealDocumentId: data.dealDocumentId ?? null,
        commentDocumentId: data.commentDocumentId ?? null,
        message: data.message,
        readAt: null,
        createdAt: "2026-07-21T00:00:00.000Z",
      };
      rows.set(data.dedupeKey, notification);
      await Promise.resolve();
      return notification;
    },
    async list(userId, options = {}) {
      return [...rows.values()].filter(
        (notification) =>
          notification.recipientUserId === userId &&
          (!options.unreadOnly || !notification.readAt),
      );
    },
    async findForRecipient(userId, notificationId) {
      return (
        [...rows.values()].find(
          (notification) =>
            notification.recipientUserId === userId &&
            notification.id === notificationId,
        ) ?? null
      );
    },
    async updateRead(notificationId, readAt) {
      const entry = [...rows.entries()].find(
        ([, notification]) => notification.id === notificationId,
      );
      if (!entry) return null;
      const updated = { ...entry[1], readAt };
      rows.set(entry[0], updated);
      return updated;
    },
  };

  return {
    calls,
    rows,
    operations: createNotificationOperations({
      async getPreferences(userId) {
        calls.push(["getPreferences", userId]);
        return preferences[userId];
      },
      repository,
      isDuplicateError: (error) => error?.code === "DUPLICATE",
      now: () => new Date("2026-07-21T12:34:56.000Z"),
    }),
  };
}

const deliveryInput = {
  recipientUserId: "recipient-1",
  actorUserId: "actor-1",
  type: "new_comment",
  dealDocumentId: "deal-1",
  commentDocumentId: "comment-1",
  eventVersion: "comment-1",
  message: "A member commented on your deal.",
};

test("notification delivery honors preferences and suppresses self-notifications", async () => {
  const fixture = createDeliveryFixture({
    "recipient-1": { newComments: false },
  });

  assert.equal(
    await fixture.operations.createAccountNotification(deliveryInput),
    null,
  );
  assert.equal(
    await fixture.operations.createAccountNotification({
      ...deliveryInput,
      actorUserId: "recipient-1",
    }),
    null,
  );
  assert.equal(
    fixture.calls.filter(([name]) => name === "create").length,
    0,
  );
});

test("the unique dedupe key suppresses concurrent duplicate delivery", async () => {
  const fixture = createDeliveryFixture({
    "recipient-1": { newComments: true },
  });

  const results = await Promise.all([
    fixture.operations.createAccountNotification(deliveryInput),
    fixture.operations.createAccountNotification(deliveryInput),
  ]);

  assert.equal(results.filter(Boolean).length, 1);
  assert.equal(fixture.rows.size, 1);
  assert.equal(
    fixture.calls.filter(([name]) => name === "create").length,
    2,
  );
});

test("read mutation enforces the recipient boundary and uses the injected clock", async () => {
  let updateCount = 0;
  const foreign = createNotification("notification-1", "recipient-2");
  const operations = createNotificationOperations({
    async getPreferences() {
      return {};
    },
    repository: {
      async create() {
        return null;
      },
      async list() {
        return [];
      },
      async findForRecipient() {
        return foreign;
      },
      async updateRead(_id, readAt) {
        updateCount += 1;
        return { ...foreign, readAt };
      },
    },
    isDuplicateError: () => false,
    now: () => new Date("2026-07-21T12:34:56.000Z"),
  });

  assert.equal(
    await operations.markAccountNotificationRead(
      "recipient-1",
      "notification-1",
      true,
    ),
    null,
  );
  assert.equal(updateCount, 0);

  const fixture = createDeliveryFixture({
    "recipient-1": { newComments: true },
  });
  const created =
    await fixture.operations.createAccountNotification(deliveryInput);
  const updated = await fixture.operations.markAccountNotificationRead(
    "recipient-1",
    created.id,
    true,
  );
  assert.equal(updated.readAt, "2026-07-21T12:34:56.000Z");
});

test("notification actions keep authorization failures generic and skip mutations", async () => {
  let mutationCount = 0;
  const operations = createNotificationActionOperations({
    async requireCurrentUser() {
      throw new Error("signed-out account details");
    },
    async getNotifications() {
      return [];
    },
    async markRead() {
      mutationCount += 1;
      return null;
    },
    revalidate() {
      throw new Error("must not revalidate");
    },
  });

  assert.deepEqual(
    await operations.setNotificationRead("notification-1", true),
    {
      ok: false,
      message: "Could not update that notification. Try again.",
    },
  );
  assert.equal(mutationCount, 0);
});

function createBulkFixture() {
  const rows = new Map([
    ["notification-1", createNotification("notification-1", "recipient-1")],
    ["notification-2", createNotification("notification-2", "recipient-1")],
  ]);
  const revalidated = [];
  let failNotificationTwo = true;

  const operations = createNotificationActionOperations({
    async requireCurrentUser() {
      return { id: "recipient-1" };
    },
    async getNotifications(userId, options = {}) {
      return [...rows.values()].filter(
        (notification) =>
          notification.recipientUserId === userId &&
          (!options.unreadOnly || !notification.readAt),
      );
    },
    async markRead(userId, notificationId) {
      const notification = rows.get(notificationId);
      if (!notification || notification.recipientUserId !== userId) return null;
      if (notificationId === "notification-2" && failNotificationTwo) {
        failNotificationTwo = false;
        throw new Error("temporary failure");
      }
      const updated = {
        ...notification,
        readAt: "2026-07-21T12:34:56.000Z",
      };
      rows.set(notificationId, updated);
      return updated;
    },
    revalidate(path) {
      revalidated.push(path);
    },
  });

  return { operations, revalidated, rows };
}

test("bulk read reports partial failure and a retry completes remaining work", async () => {
  const fixture = createBulkFixture();

  assert.deepEqual(await fixture.operations.markAllNotificationsRead(), {
    ok: false,
    message: "Some notifications could not be updated. Try again.",
  });
  assert.equal(
    [...fixture.rows.values()].filter((notification) => !notification.readAt)
      .length,
    1,
  );

  assert.deepEqual(await fixture.operations.markAllNotificationsRead(), {
    ok: true,
    message: "All notifications marked as read.",
  });
  assert.equal(
    [...fixture.rows.values()].filter((notification) => !notification.readAt)
      .length,
    0,
  );
  assert.deepEqual(fixture.revalidated, [
    "/notifications",
    "/notifications",
  ]);
});

test("bulk read stops at the maximum batch guard when storage remains stale", async () => {
  const stale = createNotification("notification-stale", "recipient-1");
  let listCount = 0;
  let markCount = 0;
  let revalidateCount = 0;
  const operations = createNotificationActionOperations({
    async requireCurrentUser() {
      return { id: "recipient-1" };
    },
    async getNotifications() {
      listCount += 1;
      return [stale];
    },
    async markRead() {
      markCount += 1;
      return { ...stale, readAt: "2026-07-21T12:34:56.000Z" };
    },
    revalidate() {
      revalidateCount += 1;
    },
  });

  assert.deepEqual(await operations.markAllNotificationsRead(), {
    ok: false,
    message: "Some notifications could not be updated. Try again.",
  });
  assert.equal(markCount, 100);
  assert.equal(listCount, 101);
  assert.equal(revalidateCount, 1);
});
