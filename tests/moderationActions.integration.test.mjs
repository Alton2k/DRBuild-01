import assert from "node:assert/strict";
import test from "node:test";

import {
  deleteDealOperation,
  moderateCommentOperation,
  moderateDealOperation,
} from "../lib/moderationActionOperations.ts";

function createDealFixture(overrides = {}) {
  const calls = [];
  const dependencies = {
    requireAdmin: async () => {
      calls.push("authorize");
    },
    getDealById: async () => {
      calls.push("read");
      return {
        id: "deal-1",
        title: "Useful deal",
        status: "pending",
        authorUserId: "author-1",
        updatedAt: "revision-1",
      };
    },
    updateDealStatus: async (_id, status) => {
      calls.push(`update:${status}`);
    },
    getSavedDealUserIds: async () => {
      calls.push("saved-users");
      return ["saver-1", "saver-2"];
    },
    createNotification: async (input) => {
      calls.push(`notify:${input.type}:${input.recipientUserId}`);
      return input;
    },
    ...overrides,
  };

  return { calls, dependencies };
}

test("moderation authorizes before validating or touching deal data", async () => {
  const { calls, dependencies } = createDealFixture({
    requireAdmin: async () => {
      calls.push("authorize");
      throw new Error("forbidden");
    },
  });

  await assert.rejects(moderateDealOperation("deal-1", "approved", dependencies), /forbidden/);
  assert.deepEqual(calls, ["authorize"]);
});

test("invalid moderation input performs no reads or writes after authorization", async () => {
  const { calls, dependencies } = createDealFixture();

  await assert.rejects(moderateDealOperation("../deal", "approved", dependencies), /Invalid moderation status/);
  assert.deepEqual(calls, ["authorize"]);

  await assert.rejects(moderateDealOperation("deal-1", "archived", dependencies), /Invalid moderation status/);
  assert.deepEqual(calls, ["authorize", "authorize"]);
});

test("first approval updates once and sends deduplicatable author and saver notifications", async () => {
  const { calls, dependencies } = createDealFixture();

  await moderateDealOperation("deal-1", "approved", dependencies);

  assert.deepEqual(calls, [
    "authorize",
    "read",
    "update:approved",
    "notify:deal_approval:author-1",
    "saved-users",
    "notify:saved_deal_update:saver-1",
    "notify:saved_deal_update:saver-2",
  ]);
});

test("repeat approval does not redeliver notifications", async () => {
  const { calls, dependencies } = createDealFixture({
    getDealById: async () => {
      calls.push("read");
      return { id: "deal-1", title: "Useful deal", status: "approved", authorUserId: "author-1" };
    },
  });

  await moderateDealOperation("deal-1", "approved", dependencies);
  assert.deepEqual(calls, ["authorize", "read", "update:approved"]);
});

test("notification failures do not roll back successful moderation", async () => {
  const { calls, dependencies } = createDealFixture({
    createNotification: async (input) => {
      calls.push(`notify:${input.type}:${input.recipientUserId}`);
      throw new Error("notification unavailable");
    },
  });

  await moderateDealOperation("deal-1", "approved", dependencies);
  assert.equal(calls.includes("update:approved"), true);
  assert.equal(calls.filter((call) => call.startsWith("notify:")).length, 3);
});

test("deal deletion authorizes first and cleans only media captured for that deal", async () => {
  const calls = [];
  await deleteDealOperation("deal-1", {
    requireAdmin: async () => calls.push("authorize"),
    getUploadedMediaIds: async () => {
      calls.push("media");
      return [11, 12];
    },
    deleteDeal: async () => calls.push("delete"),
    deleteUploadedMedia: async (ids) => calls.push(`cleanup:${ids.join(",")}`),
  });

  assert.deepEqual(calls, ["authorize", "media", "delete", "cleanup:11,12"]);
});

test("simultaneous destructive comment calls have one winner and a safe retry result", async () => {
  let exists = true;
  const mutateComment = async () => {
    await Promise.resolve();
    if (!exists) return null;
    exists = false;
    return { dealId: "deal-1" };
  };
  const dependencies = {
    requireAdmin: async () => undefined,
    mutateComment,
  };

  const results = await Promise.all([
    moderateCommentOperation("comment-1", dependencies),
    moderateCommentOperation("comment-1", dependencies),
  ]);

  assert.equal(results.filter((result) => result.ok).length, 1);
  assert.equal(results.filter((result) => !result.ok).length, 1);
  assert.deepEqual(await moderateCommentOperation("comment-1", dependencies), { ok: false });
});

test("comment moderation rejects invalid ids without invoking the mutation", async () => {
  let mutationCalls = 0;
  const result = await moderateCommentOperation("", {
    requireAdmin: async () => undefined,
    mutateComment: async () => {
      mutationCalls += 1;
      return { dealId: "deal-1" };
    },
  });

  assert.deepEqual(result, { ok: false });
  assert.equal(mutationCalls, 0);
});
