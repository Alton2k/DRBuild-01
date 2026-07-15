export const profileSettingsStorageKey = "dealmy_profile_settings";
export const profileSettingsChangedEventName = "dealmy:profile-settings-changed";
export const togglesStorageKey = "dealmy_settings_toggles";
export const defaultProfileBio = "";
export const usernameMinLength = 3;
export const usernameLimit = 24;
export const displayNameLimit = 48;
export const profileUserNameMinLength = usernameMinLength;
export const profileUserNameLimit = usernameLimit;
export const profileDisplayNameLimit = displayNameLimit;
export const profileBioLimit = 72;
export const passwordMinLength = 8;
export const passwordMaxBytes = 72;

export type SettingsTheme = "dark" | "light" | "system";

export type ToggleKey =
  | "newComments"
  | "commentReplies"
  | "dealApproval"
  | "savedDealUpdates"
  | "weeklySummary"
  | "marketingEmails"
  | "publicProfile"
  | "showJoinDate"
  | "showActivityStats"
  | "showSavedDeals"
  | "showComments"
  | "allowFollowers";

export type StoredProfileSettings = {
  avatarUrl: string;
  displayName: string;
  userName: string;
  bio: string;
};

export type AccountSettings = {
  profile: StoredProfileSettings;
  theme: SettingsTheme;
  toggles: Record<ToggleKey, boolean>;
};

export const defaultToggles: Record<ToggleKey, boolean> = {
  newComments: true,
  commentReplies: true,
  dealApproval: true,
  savedDealUpdates: true,
  weeklySummary: false,
  marketingEmails: false,
  publicProfile: true,
  showJoinDate: true,
  showActivityStats: true,
  showSavedDeals: false,
  showComments: true,
  allowFollowers: true,
};

export function createDefaultAccountSettings(displayName = "", userName = displayName): AccountSettings {
  return {
    profile: {
      avatarUrl: "",
      displayName,
      userName,
      bio: defaultProfileBio,
    },
    theme: "system",
    toggles: { ...defaultToggles },
  };
}

export function parseStoredProfileSettings(value: string | null): StoredProfileSettings | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as Partial<StoredProfileSettings>;

    return {
      avatarUrl: typeof parsed.avatarUrl === "string" ? parsed.avatarUrl : "",
      displayName: typeof parsed.displayName === "string" ? parsed.displayName : "",
      userName: typeof parsed.userName === "string" ? parsed.userName : "",
      bio: typeof parsed.bio === "string" ? parsed.bio : "",
    };
  } catch {
    return null;
  }
}

export function parseStoredToggles(raw: string | null) {
  if (!raw) {
    return { ...defaultToggles };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<Record<ToggleKey, unknown>>;
    const nextToggles = { ...defaultToggles };

    for (const key of Object.keys(defaultToggles) as ToggleKey[]) {
      if (typeof parsed[key] === "boolean") {
        nextToggles[key] = parsed[key];
      }
    }

    return nextToggles;
  } catch {
    return { ...defaultToggles };
  }
}

export function normalizeTheme(value: unknown): SettingsTheme {
  return value === "dark" || value === "light" || value === "system" ? value : "system";
}

export type PasswordChangeValidation =
  | { ok: true; currentPassword: string; password: string; passwordConfirmation: string }
  | { ok: false; field: "currentPassword" | "password" | "passwordConfirmation"; message: string };

export function validatePasswordChange(input: {
  currentPassword?: unknown;
  password?: unknown;
  passwordConfirmation?: unknown;
}): PasswordChangeValidation {
  const currentPassword = typeof input.currentPassword === "string" ? input.currentPassword : "";
  const password = typeof input.password === "string" ? input.password : "";
  const passwordConfirmation =
    typeof input.passwordConfirmation === "string" ? input.passwordConfirmation : "";

  if (!currentPassword) {
    return { ok: false, field: "currentPassword", message: "Enter your current password." };
  }

  if (password.length < passwordMinLength) {
    return {
      ok: false,
      field: "password",
      message: `New password must be at least ${passwordMinLength} characters.`,
    };
  }

  if (new TextEncoder().encode(password).length > passwordMaxBytes) {
    return {
      ok: false,
      field: "password",
      message: `New password must be ${passwordMaxBytes} bytes or fewer.`,
    };
  }

  if (!/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    return { ok: false, field: "password", message: "New password must include a number and a symbol." };
  }

  if (password === currentPassword) {
    return { ok: false, field: "password", message: "New password must be different from your current password." };
  }

  if (passwordConfirmation !== password) {
    return { ok: false, field: "passwordConfirmation", message: "New passwords do not match." };
  }

  return { ok: true, currentPassword, password, passwordConfirmation };
}

export function assertImmutableProfileHandle(currentHandle: string, requestedHandle: unknown) {
  if (typeof requestedHandle !== "string") {
    return;
  }

  const current = currentHandle.trim().toLocaleLowerCase();
  const requested = requestedHandle.trim().replace(/^@+/, "").toLocaleLowerCase();

  if (current && requested !== current) {
    throw new Error("Your profile handle cannot be changed.");
  }
}
