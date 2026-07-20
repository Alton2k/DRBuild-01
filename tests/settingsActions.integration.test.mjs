import assert from "node:assert/strict";
import test from "node:test";

import { createDefaultAccountSettings } from "../lib/accountSettings.ts";
import {
  createSettingsActionOperations,
  SettingsValidationError,
} from "../lib/settingsActionOperations.ts";

const user = {
  id: "user-17",
  email: "member@example.com",
  user_metadata: {
    full_name: "Member Seventeen",
  },
};

function createDependencies(overrides = {}) {
  const calls = [];
  const settings = createDefaultAccountSettings("Member Seventeen", "member17");

  return {
    calls,
    dependencies: {
      async getCurrentUser() {
        calls.push(["getCurrentUser"]);
        return user;
      },
      async saveSettings(userId, patch, displayName) {
        calls.push(["saveSettings", userId, patch, displayName]);
        return {
          ...settings,
          profile: {
            ...settings.profile,
            ...patch.profile,
          },
        };
      },
      async changePassword(input, account) {
        calls.push(["changePassword", input, account]);
        return { ok: true, jwt: "fresh-session" };
      },
      setAuthCookie(jwt) {
        calls.push(["setAuthCookie", jwt]);
      },
      revalidate(path, type) {
        calls.push(["revalidate", path, type]);
      },
      isPersistenceValidationError(error) {
        return error instanceof SettingsValidationError;
      },
      ...overrides,
    },
  };
}

test("avatar reset is saved only for the authenticated account", async () => {
  const fixture = createDependencies();
  const operations = createSettingsActionOperations(fixture.dependencies);

  const result = await operations.saveAccountSettings({
    profile: { avatarUrl: "" },
  });

  assert.equal(result.ok, true);
  assert.equal(result.settings?.profile.avatarUrl, "");
  assert.deepEqual(fixture.calls[1], [
    "saveSettings",
    "user-17",
    { profile: { avatarUrl: "" } },
    "Member Seventeen",
  ]);
  assert.deepEqual(
    fixture.calls.filter(([name]) => name === "revalidate"),
    [
      ["revalidate", "/profile", undefined],
      ["revalidate", "/settings", undefined],
      ["revalidate", "/", undefined],
      ["revalidate", "/deal/[id]", "page"],
    ],
  );
});

test("settings authorization runs before persistence", async () => {
  let saved = false;
  const fixture = createDependencies({
    async getCurrentUser() {
      fixture.calls.push(["getCurrentUser"]);
      return null;
    },
    async saveSettings() {
      saved = true;
      throw new Error("must not run");
    },
  });
  const operations = createSettingsActionOperations(fixture.dependencies);

  const result = await operations.saveAccountSettings({
    profile: { avatarUrl: "" },
  });

  assert.deepEqual(result, {
    ok: false,
    message: "Please log in before saving settings.",
  });
  assert.equal(saved, false);
  assert.deepEqual(fixture.calls, [["getCurrentUser"]]);
});

test("settings validation and persistence failures do not revalidate", async () => {
  const oversizedFixture = createDependencies();
  const oversizedOperations = createSettingsActionOperations(
    oversizedFixture.dependencies,
  );
  const oversizedResult = await oversizedOperations.saveAccountSettings({
    profile: { avatarUrl: "a".repeat(450_001) },
  });

  assert.equal(oversizedResult.ok, false);
  assert.match(oversizedResult.message, /too large/i);
  assert.equal(
    oversizedFixture.calls.some(([name]) => name === "saveSettings"),
    false,
  );
  assert.equal(
    oversizedFixture.calls.some(([name]) => name === "revalidate"),
    false,
  );

  const failedFixture = createDependencies({
    async saveSettings() {
      throw new Error("database password should never reach the client");
    },
  });
  const failedOperations = createSettingsActionOperations(
    failedFixture.dependencies,
  );
  const failedResult = await failedOperations.saveAccountSettings({
    profile: { displayName: "Updated" },
  });

  assert.deepEqual(failedResult, {
    ok: false,
    message: "Unable to save settings.",
  });
  assert.equal(
    failedFixture.calls.some(([name]) => name === "revalidate"),
    false,
  );
});

test("password authorization precedes verification and failures never write a cookie", async () => {
  const fixture = createDependencies({
    async changePassword(input, account) {
      fixture.calls.push(["changePassword", input, account]);
      return {
        ok: false,
        field: "currentPassword",
        message: "Your current password is incorrect.",
      };
    },
  });
  const operations = createSettingsActionOperations(fixture.dependencies);
  const input = {
    currentPassword: "wrong",
    password: "NewPassword1!",
    passwordConfirmation: "NewPassword1!",
  };

  const result = await operations.changePassword(input);

  assert.deepEqual(result, {
    ok: false,
    field: "currentPassword",
    message: "Your current password is incorrect.",
  });
  assert.deepEqual(
    fixture.calls.map(([name]) => name),
    ["getCurrentUser", "changePassword"],
  );
  assert.equal(fixture.calls[1][2].id, "user-17");
});

test("signed-out password requests never reach Strapi or write a cookie", async () => {
  const calls = [];
  const fixture = createDependencies({
    async getCurrentUser() {
      calls.push("authorize");
      return null;
    },
    async changePassword() {
      calls.push("change-password");
      return { ok: true, jwt: "must-not-be-used" };
    },
    setAuthCookie() {
      calls.push("cookie");
    },
  });
  const operations = createSettingsActionOperations(fixture.dependencies);

  assert.deepEqual(
    await operations.changePassword({
      currentPassword: "Current1!",
      password: "NewPassword1!",
      passwordConfirmation: "NewPassword1!",
    }),
    {
      ok: false,
      field: "form",
      message: "Please log in again before changing your password.",
    },
  );
  assert.deepEqual(calls, ["authorize"]);
});

test("a successful password change writes only the returned session", async () => {
  const fixture = createDependencies();
  const operations = createSettingsActionOperations(fixture.dependencies);

  const result = await operations.changePassword({
    currentPassword: "Current1!",
    password: "NewPassword1!",
    passwordConfirmation: "NewPassword1!",
  });

  assert.deepEqual(result, {
    ok: true,
    message: "Password changed. Your current session has been refreshed.",
  });
  assert.deepEqual(
    fixture.calls.filter(([name]) => name === "setAuthCookie"),
    [["setAuthCookie", "fresh-session"]],
  );
});
