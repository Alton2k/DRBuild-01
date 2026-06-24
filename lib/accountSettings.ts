export const profileSettingsStorageKey = "dealmy_profile_settings";
export const profileSettingsChangedEventName = "dealmy:profile-settings-changed";
export const togglesStorageKey = "dealmy_settings_toggles";
export const defaultProfileBio = "";
export const profileUserNameMinLength = 5;
export const profileUserNameLimit = 80;
export const profileBioLimit = 72;

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
  | "allowFollowers";

export type StoredProfileSettings = {
  avatarUrl: string;
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
  allowFollowers: true,
};

export function createDefaultAccountSettings(displayName = ""): AccountSettings {
  return {
    profile: {
      avatarUrl: "",
      userName: displayName,
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
