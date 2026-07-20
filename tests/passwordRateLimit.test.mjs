import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

import {
  assertPasswordRateLimitSecret,
  createRateLimitedChangePasswordController,
  consumePasswordRateLimit,
  hashPasswordRateLimitIdentifier,
  resolvePasswordRateLimitIp,
} from "../backend/src/lib/passwordRateLimit.ts";
import {
  createPasswordRateLimitProof,
  getPasswordRateLimitRetryMessage,
  selectTrustedPasswordClientIp,
} from "../lib/passwordRateLimitProof.ts";

const backendRequire = createRequire(new URL("../backend/package.json", import.meta.url));
const createKnex = backendRequire("knex");
const migration = backendRequire("./database/migrations/2026.07.21T100000.add-password-rate-limits.js");
const secret = "test-only-password-rate-limit-secret-with-32-bytes";

const permissivePolicy = {
  account: { limit: 100, windowMs: 60_000, lockMs: 60_000 },
  ip: { limit: 100, windowMs: 60_000, lockMs: 60_000 },
};

test("requires a dedicated secret with at least 32 bytes", () => {
  assert.throws(
    () => assertPasswordRateLimitSecret(undefined),
    /PASSWORD_RATE_LIMIT_SECRET/,
  );
  assert.throws(
    () => assertPasswordRateLimitSecret("too-short"),
    /at least 32 bytes/,
  );
  assert.doesNotThrow(() => assertPasswordRateLimitSecret(secret));
});

async function createFixture() {
  const connection = createKnex({
    client: "better-sqlite3",
    connection: { filename: ":memory:" },
    useNullAsDefault: true,
    pool: { min: 1, max: 1 },
  });
  await migration.up(connection);
  return connection;
}

test("stores only scoped HMAC identifiers", async (t) => {
  const connection = await createFixture();
  t.after(() => connection.destroy());

  await consumePasswordRateLimit({
    connection,
    secret,
    accountId: "account-123",
    ipAddress: "203.0.113.42",
    policies: permissivePolicy,
  });

  const rows = await connection("password_rate_limits").select("*").orderBy("scope");
  assert.equal(rows.length, 2);
  assert.deepEqual(rows.map((row) => row.scope), ["account", "ip"]);
  assert.ok(rows.every((row) => /^[a-f0-9]{64}$/.test(row.identifier_hash)));
  assert.ok(rows.every((row) => !JSON.stringify(row).includes("account-123")));
  assert.ok(rows.every((row) => !JSON.stringify(row).includes("203.0.113.42")));
  assert.notEqual(
    hashPasswordRateLimitIdentifier(secret, "account", "shared-value"),
    hashPasswordRateLimitIdentifier(secret, "ip", "shared-value"),
  );
});

test("serializes concurrent attempts and locks after the configured boundary", async (t) => {
  const connection = await createFixture();
  t.after(() => connection.destroy());
  const now = new Date("2026-07-21T00:00:00.000Z");
  const policies = {
    account: { limit: 3, windowMs: 60_000, lockMs: 30_000 },
    ip: { limit: 100, windowMs: 60_000, lockMs: 30_000 },
  };

  const results = await Promise.all(
    Array.from({ length: 6 }, () =>
      consumePasswordRateLimit({
        connection,
        secret,
        accountId: "same-account",
        ipAddress: "198.51.100.10",
        now,
        policies,
      }),
    ),
  );

  assert.equal(results.filter((result) => result.allowed).length, 3);
  assert.equal(results.filter((result) => !result.allowed).length, 3);
  assert.ok(results.filter((result) => !result.allowed).every((result) => result.retryAfterSeconds === 30));

  const accountHash = hashPasswordRateLimitIdentifier(secret, "account", "same-account");
  const row = await connection("password_rate_limits")
    .where({ scope: "account", identifier_hash: accountHash })
    .first();
  assert.equal(row.attempts, 4);
  assert.ok(row.locked_until);
});

test("expires lockouts and cleans expired buckets", async (t) => {
  const connection = await createFixture();
  t.after(() => connection.destroy());
  const policies = {
    account: { limit: 1, windowMs: 1_000, lockMs: 2_000 },
    ip: { limit: 100, windowMs: 1_000, lockMs: 2_000 },
  };
  const start = new Date("2026-07-21T00:00:00.000Z");

  assert.equal((await consumePasswordRateLimit({
    connection,
    secret,
    accountId: "expiry-account",
    ipAddress: "192.0.2.1",
    now: start,
    policies,
  })).allowed, true);
  assert.equal((await consumePasswordRateLimit({
    connection,
    secret,
    accountId: "expiry-account",
    ipAddress: "192.0.2.1",
    now: start,
    policies,
  })).allowed, false);

  const afterExpiry = new Date(start.getTime() + 2_001);
  assert.equal((await consumePasswordRateLimit({
    connection,
    secret,
    accountId: "expiry-account",
    ipAddress: "192.0.2.1",
    now: afterExpiry,
    policies,
  })).allowed, true);

  const rows = await connection("password_rate_limits").select("attempts");
  assert.equal(rows.length, 2);
  assert.ok(rows.every((row) => row.attempts === 1));
});

test("enforces account and IP limits as independent boundaries", async (t) => {
  const connection = await createFixture();
  t.after(() => connection.destroy());
  const now = new Date("2026-07-21T00:00:00.000Z");
  const accountBound = {
    account: { limit: 1, windowMs: 60_000, lockMs: 60_000 },
    ip: { limit: 100, windowMs: 60_000, lockMs: 60_000 },
  };

  assert.equal((await consumePasswordRateLimit({
    connection,
    secret,
    accountId: "account-a",
    ipAddress: "192.0.2.10",
    now,
    policies: accountBound,
  })).allowed, true);
  assert.equal((await consumePasswordRateLimit({
    connection,
    secret,
    accountId: "account-b",
    ipAddress: "192.0.2.10",
    now,
    policies: accountBound,
  })).allowed, true);
  assert.equal((await consumePasswordRateLimit({
    connection,
    secret,
    accountId: "account-a",
    ipAddress: "192.0.2.11",
    now,
    policies: accountBound,
  })).allowed, false);

  const ipBound = {
    account: { limit: 100, windowMs: 60_000, lockMs: 60_000 },
    ip: { limit: 2, windowMs: 60_000, lockMs: 60_000 },
  };
  assert.equal((await consumePasswordRateLimit({
    connection,
    secret,
    accountId: "account-c",
    ipAddress: "198.51.100.20",
    now,
    policies: ipBound,
  })).allowed, true);
  assert.equal((await consumePasswordRateLimit({
    connection,
    secret,
    accountId: "account-d",
    ipAddress: "198.51.100.20",
    now,
    policies: ipBound,
  })).allowed, true);
  assert.equal((await consumePasswordRateLimit({
    connection,
    secret,
    accountId: "account-e",
    ipAddress: "198.51.100.20",
    now,
    policies: ipBound,
  })).allowed, false);
});

test("controller uses authenticated identity and forwards allowed requests", async () => {
  let consumed;
  let originalCalls = 0;
  const controller = createRateLimitedChangePasswordController({
    consume: async (input) => {
      consumed = input;
      return { allowed: true, retryAfterSeconds: 0 };
    },
    getConnection: () => "fixture-connection",
    getSecret: () => secret,
    originalChangePassword: async () => {
      originalCalls += 1;
      return { ok: true };
    },
  });

  const proof = createPasswordRateLimitProof({
    secret,
    accountId: "42",
    ipAddress: "203.0.113.5",
  });
  const result = await controller({
    state: { user: { id: 42 } },
    request: {
      ip: "10.0.0.8",
      headers: Object.fromEntries(
        Object.entries(proof).map(([name, value]) => [name.toLowerCase(), value]),
      ),
      body: { userId: "spoofed-account", currentPassword: "not-observed-by-limiter" },
    },
  });

  assert.deepEqual(result, { ok: true });
  assert.equal(originalCalls, 1);
  assert.equal(consumed.accountId, "42");
  assert.equal(consumed.ipAddress, "203.0.113.5");
  assert.equal(consumed.connection, "fixture-connection");
  assert.equal("currentPassword" in consumed, false);
});

test("client IP proofs are account-bound, short-lived, and tamper-resistant", () => {
  const now = new Date("2026-07-21T12:00:00.000Z");
  const proof = createPasswordRateLimitProof({
    secret,
    accountId: "account-1",
    ipAddress: "203.0.113.25",
    now,
  });
  const headers = Object.fromEntries(
    Object.entries(proof).map(([name, value]) => [name.toLowerCase(), value]),
  );
  const context = { request: { ip: "10.0.0.8", headers } };

  assert.equal(
    resolvePasswordRateLimitIp({ ctx: context, secret, accountId: "account-1", now }),
    "203.0.113.25",
  );
  assert.throws(
    () => resolvePasswordRateLimitIp({ ctx: context, secret, accountId: "account-2", now }),
    /invalid/,
  );
  assert.throws(
    () =>
      resolvePasswordRateLimitIp({
        ctx: context,
        secret,
        accountId: "account-1",
        now: new Date(now.getTime() + 61_000),
      }),
    /expired/,
  );

  const tampered = {
    request: {
      ip: "10.0.0.8",
      headers: {
        ...headers,
        "x-deal-rakyat-client-ip": "198.51.100.99",
      },
    },
  };
  assert.throws(
    () => resolvePasswordRateLimitIp({ ctx: tampered, secret, accountId: "account-1", now }),
    /invalid/,
  );
});

test("direct backend password calls use the backend-observed IP", () => {
  assert.equal(
    resolvePasswordRateLimitIp({
      ctx: { request: { ip: "198.51.100.7", headers: {} } },
      secret,
      accountId: "account-1",
    }),
    "198.51.100.7",
  );
});

test("retry timing is sanitized for the password action message", () => {
  assert.equal(
    getPasswordRateLimitRetryMessage("27"),
    "Too many password change attempts. Try again in 1 minute.",
  );
  assert.equal(
    getPasswordRateLimitRetryMessage("900"),
    "Too many password change attempts. Try again in 15 minutes.",
  );
  assert.equal(
    getPasswordRateLimitRetryMessage("database-secret"),
    "Too many password change attempts. Please try again later.",
  );
});

test("production trusts Vercel's protected IP header over spoofable forwarding headers", () => {
  const headers = new Map([
    ["x-vercel-forwarded-for", "203.0.113.8"],
    ["x-forwarded-for", "198.51.100.99"],
    ["x-real-ip", "192.0.2.44"],
  ]);
  const getHeader = (name) => headers.get(name) ?? null;

  assert.equal(selectTrustedPasswordClientIp(getHeader, true), "203.0.113.8");

  headers.delete("x-vercel-forwarded-for");
  assert.equal(selectTrustedPasswordClientIp(getHeader, true), "");
  assert.equal(selectTrustedPasswordClientIp(getHeader, false), "198.51.100.99");
});

test("controller rejects unauthenticated, locked, and limiter-failure requests generically", async () => {
  let originalCalls = 0;
  let consumeCalls = 0;
  const originalChangePassword = async () => {
    originalCalls += 1;
  };

  const unauthorized = createRateLimitedChangePasswordController({
    consume: async () => {
      consumeCalls += 1;
      return { allowed: true, retryAfterSeconds: 0 };
    },
    getConnection: () => ({}),
    getSecret: () => secret,
    originalChangePassword,
  });
  await assert.rejects(
    unauthorized({ state: {}, request: { ip: "192.0.2.1" } }),
    (error) => error.name === "UnauthorizedError",
  );
  assert.equal(consumeCalls, 0);

  const invalidProof = createRateLimitedChangePasswordController({
    consume: async () => {
      consumeCalls += 1;
      return { allowed: true, retryAfterSeconds: 0 };
    },
    getConnection: () => ({}),
    getSecret: () => secret,
    originalChangePassword,
  });
  await assert.rejects(
    invalidProof({
      state: { user: { id: 1 } },
      request: {
        ip: "10.0.0.8",
        headers: {
          "x-deal-rakyat-client-ip": "203.0.113.4",
          "x-deal-rakyat-client-ip-timestamp": String(Math.floor(Date.now() / 1000)),
          "x-deal-rakyat-client-ip-signature": "0".repeat(64),
        },
      },
    }),
    (error) =>
      error.name === "ApplicationError" &&
      error.message === "Unable to process the password change. Please try again later.",
  );
  assert.equal(consumeCalls, 0);

  const headers = {};
  const locked = createRateLimitedChangePasswordController({
    consume: async () => ({ allowed: false, retryAfterSeconds: 27 }),
    getConnection: () => ({}),
    getSecret: () => secret,
    originalChangePassword,
  });
  await assert.rejects(
    locked({
      state: { user: { id: 1 } },
      request: { ip: "192.0.2.1" },
      set: (name, value) => {
        headers[name] = value;
      },
    }),
    (error) =>
      error.name === "RateLimitError" &&
      error.message === "Too many password change attempts. Please try again later." &&
      error.details.retryAfterSeconds === 27,
  );
  assert.equal(headers["Retry-After"], "27");

  const unavailable = createRateLimitedChangePasswordController({
    consume: async () => {
      throw new Error("database host and private details");
    },
    getConnection: () => ({}),
    getSecret: () => secret,
    originalChangePassword,
  });
  await assert.rejects(
    unavailable({ state: { user: { id: 1 } }, request: { ip: "192.0.2.1" } }),
    (error) =>
      error.name === "ApplicationError" &&
      error.message === "Unable to process the password change. Please try again later." &&
      !error.message.includes("database"),
  );
  assert.equal(originalCalls, 0);
});
