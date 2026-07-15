import assert from "node:assert/strict";
import test from "node:test";

import {
  assertImmutableProfileHandle,
  validatePasswordChange,
} from "../lib/accountSettings.ts";
import { hasImmutableUserSettingChange } from "../backend/src/api/user-setting/utils/immutability.ts";

test("accepts a strong password change and preserves password whitespace", () => {
  const result = validatePasswordChange({
    currentPassword: "old password",
    password: " new password 2! ",
    passwordConfirmation: " new password 2! ",
  });

  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.password, " new password 2! ");
});

test("rejects missing current password, weak new passwords, reuse, and mismatch", () => {
  assert.equal(validatePasswordChange({ password: "Strong123!", passwordConfirmation: "Strong123!" }).field, "currentPassword");
  assert.equal(validatePasswordChange({ currentPassword: "old", password: "short1!", passwordConfirmation: "short1!" }).field, "password");
  assert.equal(validatePasswordChange({ currentPassword: "Same123!", password: "Same123!", passwordConfirmation: "Same123!" }).field, "password");
  assert.equal(validatePasswordChange({ currentPassword: "old", password: "Strong123!", passwordConfirmation: "Other123!" }).field, "passwordConfirmation");
});

test("rejects passwords beyond bcrypt's byte limit", () => {
  const password = `${"🙂".repeat(18)}1!`;
  assert.ok(password.length < 72);
  assert.equal(validatePasswordChange({ currentPassword: "old", password, passwordConfirmation: password }).field, "password");
});

test("profile handles are immutable but equivalent formatting is accepted", () => {
  assert.doesNotThrow(() => assertImmutableProfileHandle("member.one", "@Member.One"));
  assert.throws(() => assertImmutableProfileHandle("member.one", "member.two"), /cannot be changed/);

  assert.deepEqual(
    hasImmutableUserSettingChange(
      { userId: "7", username: "member.one" },
      { userId: "8", username: "member.two" },
    ),
    { changesUserId: true, changesHandle: true },
  );
});
