import { createHmac, timingSafeEqual } from 'node:crypto';
import { isIP } from 'node:net';
import { errors } from '@strapi/utils';

const TABLE_NAME = 'password_rate_limits';
const MINIMUM_SECRET_BYTES = 32;
const RATE_LIMIT_MESSAGE = 'Too many password change attempts. Please try again later.';
const UNAVAILABLE_MESSAGE = 'Unable to process the password change. Please try again later.';
const CLIENT_IP_HEADER = 'x-deal-rakyat-client-ip';
const CLIENT_IP_TIMESTAMP_HEADER = 'x-deal-rakyat-client-ip-timestamp';
const CLIENT_IP_SIGNATURE_HEADER = 'x-deal-rakyat-client-ip-signature';
const CLIENT_IP_PROOF_VERSION = 'v1';
const CLIENT_IP_PROOF_MAX_AGE_SECONDS = 60;

export type PasswordRateLimitScope = 'account' | 'ip';

export type PasswordRateLimitPolicy = {
  limit: number;
  windowMs: number;
  lockMs: number;
};

export type PasswordRateLimitPolicies = Record<PasswordRateLimitScope, PasswordRateLimitPolicy>;

export const DEFAULT_PASSWORD_RATE_LIMIT_POLICIES: PasswordRateLimitPolicies = {
  account: {
    limit: 5,
    windowMs: 15 * 60 * 1000,
    lockMs: 15 * 60 * 1000,
  },
  ip: {
    limit: 20,
    windowMs: 15 * 60 * 1000,
    lockMs: 15 * 60 * 1000,
  },
};

type PasswordRateLimitRow = {
  attempts: number;
  window_started_at: Date | string;
  locked_until: Date | string | null;
};

type Bucket = {
  scope: PasswordRateLimitScope;
  identifierHash: string;
  policy: PasswordRateLimitPolicy;
};

export type PasswordRateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

type ChangePasswordControllerDependencies = {
  consume?: typeof consumePasswordRateLimit;
  getConnection: () => any;
  getSecret: () => string | undefined;
  originalChangePassword: (ctx: any) => Promise<unknown>;
};

export function assertPasswordRateLimitSecret(
  secret: string | undefined,
): asserts secret is string {
  if (!secret || Buffer.byteLength(secret, 'utf8') < MINIMUM_SECRET_BYTES) {
    throw new Error(
      `PASSWORD_RATE_LIMIT_SECRET must contain at least ${MINIMUM_SECRET_BYTES} bytes`,
    );
  }
}

function validateIdentifier(value: string, label: string) {
  if (!value.trim()) {
    throw new Error(`${label} is required for password rate limiting`);
  }
}

function getRequestHeader(ctx: any, name: string) {
  if (typeof ctx.get === 'function') {
    const value = ctx.get(name);
    if (typeof value === 'string') return value;
  }

  const value = ctx.request?.headers?.[name] ?? ctx.headers?.[name];
  return typeof value === 'string' ? value : '';
}

function createClientIpProofPayload(accountId: string, ipAddress: string, timestamp: string) {
  return [CLIENT_IP_PROOF_VERSION, accountId, ipAddress, timestamp].join('\0');
}

export function resolvePasswordRateLimitIp({
  ctx,
  secret,
  accountId,
  now = new Date(),
}: {
  ctx: any;
  secret: string;
  accountId: string;
  now?: Date;
}) {
  assertPasswordRateLimitSecret(secret);
  validateIdentifier(accountId, 'accountId');
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) {
    throw new Error('A valid current time is required for password rate limiting');
  }

  const providedIp = getRequestHeader(ctx, CLIENT_IP_HEADER);
  const providedTimestamp = getRequestHeader(ctx, CLIENT_IP_TIMESTAMP_HEADER);
  const providedSignature = getRequestHeader(ctx, CLIENT_IP_SIGNATURE_HEADER);
  const hasAnyProofHeader = Boolean(providedIp || providedTimestamp || providedSignature);

  if (!hasAnyProofHeader) {
    const observedIp = ctx.request?.ip ?? ctx.ip;
    if (typeof observedIp !== 'string' || !observedIp.trim()) {
      throw new Error('A request IP is required for password rate limiting');
    }
    const normalizedObservedIp = observedIp.trim().toLowerCase();
    if (!isIP(normalizedObservedIp)) {
      throw new Error('A valid request IP is required for password rate limiting');
    }
    return normalizedObservedIp;
  }

  validateIdentifier(providedIp, 'client IP proof');
  if (!/^\d{10}$/.test(providedTimestamp) || !/^[a-f0-9]{64}$/i.test(providedSignature)) {
    throw new Error('The client IP proof is malformed');
  }

  const proofTimestamp = Number(providedTimestamp);
  const nowTimestamp = Math.floor(now.getTime() / 1000);
  if (Math.abs(nowTimestamp - proofTimestamp) > CLIENT_IP_PROOF_MAX_AGE_SECONDS) {
    throw new Error('The client IP proof has expired');
  }

  const normalizedAccountId = accountId.trim();
  const normalizedIpAddress = providedIp.trim().toLowerCase();
  if (!isIP(normalizedIpAddress)) {
    throw new Error('The client IP proof contains an invalid IP');
  }
  const expectedSignature = createHmac('sha256', secret)
    .update(createClientIpProofPayload(normalizedAccountId, normalizedIpAddress, providedTimestamp))
    .digest();
  const receivedSignature = Buffer.from(providedSignature, 'hex');

  if (
    receivedSignature.length !== expectedSignature.length ||
    !timingSafeEqual(receivedSignature, expectedSignature)
  ) {
    throw new Error('The client IP proof is invalid');
  }

  return normalizedIpAddress;
}

function validatePolicy(policy: PasswordRateLimitPolicy) {
  if (
    !Number.isSafeInteger(policy.limit) ||
    policy.limit < 1 ||
    !Number.isSafeInteger(policy.windowMs) ||
    policy.windowMs < 1 ||
    !Number.isSafeInteger(policy.lockMs) ||
    policy.lockMs < 1
  ) {
    throw new Error('Password rate limit policy values must be positive integers');
  }
}

export function hashPasswordRateLimitIdentifier(
  secret: string,
  scope: PasswordRateLimitScope,
  identifier: string,
) {
  assertPasswordRateLimitSecret(secret);
  validateIdentifier(identifier, scope);

  return createHmac('sha256', secret)
    .update(scope)
    .update('\0')
    .update(identifier.trim().toLowerCase())
    .digest('hex');
}

function asTimestamp(value: Date | string | null) {
  if (!value) return 0;
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) throw new Error('Password rate limit row contains an invalid date');
  return timestamp;
}

function createBuckets({
  secret,
  accountId,
  ipAddress,
  policies,
}: {
  secret: string;
  accountId: string;
  ipAddress: string;
  policies: PasswordRateLimitPolicies;
}): Bucket[] {
  assertPasswordRateLimitSecret(secret);
  validateIdentifier(accountId, 'accountId');
  validateIdentifier(ipAddress, 'ipAddress');
  validatePolicy(policies.account);
  validatePolicy(policies.ip);

  return (['account', 'ip'] as const).map((scope) => ({
    scope,
    identifierHash: hashPasswordRateLimitIdentifier(
      secret,
      scope,
      scope === 'account' ? accountId : ipAddress,
    ),
    policy: policies[scope],
  }));
}

/**
 * Atomically consumes the account and IP buckets in one database transaction.
 *
 * Each row is created with an insert-on-conflict before it is selected FOR
 * UPDATE. That closes the missing-row race and serializes concurrent attempts
 * across all Strapi instances sharing PostgreSQL.
 */
export async function consumePasswordRateLimit({
  connection,
  secret,
  accountId,
  ipAddress,
  now = new Date(),
  policies = DEFAULT_PASSWORD_RATE_LIMIT_POLICIES,
}: {
  connection: any;
  secret: string;
  accountId: string;
  ipAddress: string;
  now?: Date;
  policies?: PasswordRateLimitPolicies;
}): Promise<PasswordRateLimitResult> {
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) {
    throw new Error('A valid current time is required for password rate limiting');
  }

  const buckets = createBuckets({ secret, accountId, ipAddress, policies });
  const nowTimestamp = now.getTime();

  return connection.transaction(async (transaction: any) => {
    await transaction(TABLE_NAME).where('expires_at', '<=', now).delete();

    let retryAfterMs = 0;

    for (const bucket of buckets) {
      await transaction(TABLE_NAME)
        .insert({
          scope: bucket.scope,
          identifier_hash: bucket.identifierHash,
          attempts: 0,
          window_started_at: now,
          locked_until: null,
          expires_at: new Date(nowTimestamp + bucket.policy.windowMs),
          created_at: now,
          updated_at: now,
        })
        .onConflict(['scope', 'identifier_hash'])
        .ignore();

      const row = (await transaction(TABLE_NAME)
        .select('attempts', 'window_started_at', 'locked_until')
        .where({
          scope: bucket.scope,
          identifier_hash: bucket.identifierHash,
        })
        .forUpdate()
        .first()) as PasswordRateLimitRow | undefined;

      if (!row) {
        throw new Error('Password rate limit bucket could not be created');
      }

      const existingLockTimestamp = asTimestamp(row.locked_until);
      if (existingLockTimestamp > nowTimestamp) {
        retryAfterMs = Math.max(retryAfterMs, existingLockTimestamp - nowTimestamp);
        continue;
      }

      const existingWindowTimestamp = asTimestamp(row.window_started_at);
      const windowExpired =
        existingWindowTimestamp + bucket.policy.windowMs <= nowTimestamp;
      const windowStartedAt = windowExpired ? now : new Date(existingWindowTimestamp);
      const attempts = windowExpired ? 1 : Number(row.attempts) + 1;
      const lockedUntil =
        attempts > bucket.policy.limit
          ? new Date(nowTimestamp + bucket.policy.lockMs)
          : null;
      const windowExpiresAt = windowStartedAt.getTime() + bucket.policy.windowMs;
      const expiresAt = new Date(
        Math.max(windowExpiresAt, lockedUntil?.getTime() ?? 0),
      );

      await transaction(TABLE_NAME)
        .where({
          scope: bucket.scope,
          identifier_hash: bucket.identifierHash,
        })
        .update({
          attempts,
          window_started_at: windowStartedAt,
          locked_until: lockedUntil,
          expires_at: expiresAt,
          updated_at: now,
        });

      if (lockedUntil) {
        retryAfterMs = Math.max(retryAfterMs, lockedUntil.getTime() - nowTimestamp);
      }
    }

    return {
      allowed: retryAfterMs === 0,
      retryAfterSeconds: Math.max(0, Math.ceil(retryAfterMs / 1000)),
    };
  });
}

export function createRateLimitedChangePasswordController({
  consume = consumePasswordRateLimit,
  getConnection,
  getSecret,
  originalChangePassword,
}: ChangePasswordControllerDependencies) {
  return async (ctx: any) => {
    const authenticatedUserId = ctx.state?.user?.id;
    if (authenticatedUserId === undefined || authenticatedUserId === null) {
      throw new errors.UnauthorizedError('Authentication is required to change a password');
    }

    let result;
    try {
      const secret = getSecret() ?? '';
      const ipAddress = resolvePasswordRateLimitIp({
        ctx,
        secret,
        accountId: String(authenticatedUserId),
      });
      result = await consume({
        connection: getConnection(),
        secret,
        accountId: String(authenticatedUserId),
        ipAddress,
      });
    } catch {
      // Fail closed. Deliberately omit identifiers, credentials, and the
      // underlying database/configuration error from logs and the response.
      throw new errors.ApplicationError(UNAVAILABLE_MESSAGE);
    }

    if (!result.allowed) {
      if (result.retryAfterSeconds > 0 && typeof ctx.set === 'function') {
        ctx.set('Retry-After', String(result.retryAfterSeconds));
      }
      throw new errors.RateLimitError(RATE_LIMIT_MESSAGE, {
        retryAfterSeconds: result.retryAfterSeconds,
      });
    }

    return originalChangePassword(ctx);
  };
}
