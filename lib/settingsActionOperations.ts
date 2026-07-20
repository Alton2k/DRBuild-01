import {
  displayNameLimit,
  profileBioLimit,
  type AccountSettings,
  type StoredProfileSettings,
  type ToggleKey,
} from "./accountSettings.ts";

export type SettingsPatch = {
  profile?: Partial<StoredProfileSettings>;
  theme?: unknown;
  toggles?: Partial<Record<ToggleKey, unknown>>;
};

export type SettingsActionUser = {
  id: string;
  email?: string;
  user_metadata: {
    name?: string;
    full_name?: string;
  };
};

export type SaveAccountSettingsActionResult = {
  ok: boolean;
  message: string;
  settings?: AccountSettings;
};

export type ChangePasswordActionResult = {
  ok: boolean;
  field?: "currentPassword" | "password" | "passwordConfirmation" | "form";
  message: string;
};

export type ChangePasswordInput = {
  currentPassword: string;
  password: string;
  passwordConfirmation: string;
};

type ChangePasswordResult =
  | { ok: true; jwt: string }
  | {
      ok: false;
      field: "currentPassword" | "password" | "passwordConfirmation" | "form";
      message: string;
    };

type SettingsActionDependencies = {
  getCurrentUser: () => Promise<SettingsActionUser | null>;
  saveSettings: (userId: string, patch: SettingsPatch, displayName: string) => Promise<AccountSettings>;
  changePassword: (input: ChangePasswordInput, user: SettingsActionUser) => Promise<ChangePasswordResult>;
  setAuthCookie: (jwt: string) => Promise<void> | void;
  revalidate: (path: string, type?: "page") => void;
  isPersistenceValidationError?: (error: unknown) => boolean;
};

const avatarDataUrlLimit = 450_000;

export class SettingsValidationError extends Error {}

function getDisplayName(user: SettingsActionUser) {
  return user.user_metadata.full_name ?? user.user_metadata.name ?? user.email ?? "";
}

export function validateSettingsPatch(patch: SettingsPatch): SettingsPatch {
  const nextPatch: SettingsPatch = {};

  if (patch.profile) {
    const profile: NonNullable<SettingsPatch["profile"]> = {};

    if (typeof patch.profile.avatarUrl === "string") {
      if (patch.profile.avatarUrl.length > avatarDataUrlLimit) {
        throw new SettingsValidationError("Profile picture is too large. Upload it again so it can be resized before saving.");
      }

      profile.avatarUrl = patch.profile.avatarUrl;
    }

    if (typeof patch.profile.displayName === "string") {
      const displayName = patch.profile.displayName.trim();

      if (displayName.length > displayNameLimit) {
        throw new SettingsValidationError(`Display name must be ${displayNameLimit} characters or fewer.`);
      }

      profile.displayName = displayName;
    }

    if (typeof patch.profile.bio === "string") {
      const bio = patch.profile.bio;

      if (bio.length > profileBioLimit) {
        throw new SettingsValidationError(`Bio must be ${profileBioLimit} characters or fewer.`);
      }

      profile.bio = bio;
    }

    nextPatch.profile = profile;
  }

  if (patch.theme !== undefined) {
    nextPatch.theme = patch.theme;
  }

  if (patch.toggles) {
    nextPatch.toggles = {
      ...patch.toggles,
      weeklySummary: false,
      marketingEmails: false,
    };
  }

  return nextPatch;
}

export function createSettingsActionOperations(dependencies: SettingsActionDependencies) {
  return {
    async saveAccountSettings(patch: SettingsPatch): Promise<SaveAccountSettingsActionResult> {
      const user = await dependencies.getCurrentUser();

      if (!user) {
        return {
          ok: false,
          message: "Please log in before saving settings.",
        };
      }

      try {
        const settings = await dependencies.saveSettings(
          user.id,
          validateSettingsPatch(patch),
          getDisplayName(user),
        );

        dependencies.revalidate("/profile");
        dependencies.revalidate("/settings");
        dependencies.revalidate("/");
        dependencies.revalidate("/deal/[id]", "page");

        return {
          ok: true,
          message: "Settings saved.",
          settings,
        };
      } catch (error) {
        return {
          ok: false,
          message:
            error instanceof SettingsValidationError ||
            dependencies.isPersistenceValidationError?.(error)
              ? (error as Error).message
              : "Unable to save settings.",
        };
      }
    },

    async changePassword(input: ChangePasswordInput): Promise<ChangePasswordActionResult> {
      const user = await dependencies.getCurrentUser();

      if (!user) {
        return { ok: false, field: "form", message: "Please log in again before changing your password." };
      }

      const result = await dependencies.changePassword(input, user);
      if (!result.ok) return result;

      await dependencies.setAuthCookie(result.jwt);

      return { ok: true, message: "Password changed. Your current session has been refreshed." };
    },
  };
}
