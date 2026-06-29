import "server-only";

import {
  AccountSettings,
  SettingsTheme,
  StoredProfileSettings,
  ToggleKey,
  createDefaultAccountSettings,
  defaultToggles,
  normalizeTheme,
  profileUserNameLimit,
  profileUserNameMinLength,
} from "./accountSettings";
import {
  StrapiEntity,
  StrapiListResponse,
  StrapiSingleResponse,
  getStrapiEntityFields,
  getStrapiEntityId,
  strapiRequest,
} from "./strapi";

type StrapiUserSetting = {
  userId: string;
  profileAvatarUrl?: string | null;
  profileUserName?: string | null;
  profileBio?: string | null;
  theme?: string | null;
  notificationSettings?: Partial<Record<ToggleKey, boolean>> | null;
  privacySettings?: Partial<Record<ToggleKey, boolean>> | null;
};

const avatarDataUrlLimit = 450_000;

export class UserSettingsValidationError extends Error {}

export type AccountSettingsPatch = {
  profile?: Partial<StoredProfileSettings>;
  theme?: unknown;
  toggles?: Partial<Record<ToggleKey, unknown>>;
};

function normalizeToggleGroup(value: StrapiUserSetting["notificationSettings"]) {
  const nextToggles: Partial<Record<ToggleKey, boolean>> = {};

  if (!value || typeof value !== "object") {
    return nextToggles;
  }

  for (const key of Object.keys(defaultToggles) as ToggleKey[]) {
    if (typeof value[key] === "boolean") {
      nextToggles[key] = value[key];
    }
  }

  return nextToggles;
}

function splitToggles(toggles: Record<ToggleKey, boolean>) {
  return {
    notificationSettings: {
      newComments: toggles.newComments,
      commentReplies: toggles.commentReplies,
      dealApproval: toggles.dealApproval,
      savedDealUpdates: toggles.savedDealUpdates,
      weeklySummary: toggles.weeklySummary,
      marketingEmails: toggles.marketingEmails,
    },
    privacySettings: {
      publicProfile: toggles.publicProfile,
      showJoinDate: toggles.showJoinDate,
      showActivityStats: toggles.showActivityStats,
      showSavedDeals: toggles.showSavedDeals,
      showComments: toggles.showComments,
      allowFollowers: toggles.allowFollowers,
    },
  };
}

function normalizeSettings(fields: Partial<StrapiUserSetting>, displayName = ""): AccountSettings {
  const fallback = createDefaultAccountSettings(displayName);

  return {
    profile: {
      avatarUrl: typeof fields.profileAvatarUrl === "string" ? fields.profileAvatarUrl : fallback.profile.avatarUrl,
      userName: typeof fields.profileUserName === "string" && fields.profileUserName ? fields.profileUserName : fallback.profile.userName,
      bio: typeof fields.profileBio === "string" ? fields.profileBio : fallback.profile.bio,
    },
    theme: normalizeTheme(fields.theme),
    toggles: {
      ...fallback.toggles,
      ...normalizeToggleGroup(fields.notificationSettings),
      ...normalizeToggleGroup(fields.privacySettings),
    },
  };
}

function serializeSettingsPatch(userId: string, settings: AccountSettings, patch: AccountSettingsPatch): StrapiUserSetting {
  const data: StrapiUserSetting = { userId };

  if (patch.profile) {
    if (typeof patch.profile.avatarUrl === "string") {
      data.profileAvatarUrl = settings.profile.avatarUrl;
    }

    if (typeof patch.profile.userName === "string") {
      data.profileUserName = settings.profile.userName;
    }

    if (typeof patch.profile.bio === "string") {
      data.profileBio = settings.profile.bio;
    }
  }

  if (patch.theme !== undefined) {
    data.theme = settings.theme;
  }

  if (patch.toggles) {
    Object.assign(data, splitToggles(settings.toggles));
  }

  return data;
}

function mergeSettings(settings: AccountSettings, patch: AccountSettingsPatch): AccountSettings {
  const nextSettings: AccountSettings = {
    profile: { ...settings.profile },
    theme: settings.theme,
    toggles: { ...settings.toggles },
  };

  if (patch.profile) {
    if (typeof patch.profile.avatarUrl === "string") {
      if (patch.profile.avatarUrl.length > avatarDataUrlLimit) {
        throw new Error("Profile picture is too large. Upload it again so it can be resized before saving.");
      }

      nextSettings.profile.avatarUrl = patch.profile.avatarUrl;
    }

    if (typeof patch.profile.userName === "string") {
      nextSettings.profile.userName = patch.profile.userName.trim();
    }

    if (typeof patch.profile.bio === "string") {
      nextSettings.profile.bio = patch.profile.bio;
    }
  }

  if (patch.theme !== undefined) {
    nextSettings.theme = normalizeTheme(patch.theme);
  }

  if (patch.toggles) {
    for (const key of Object.keys(defaultToggles) as ToggleKey[]) {
      if (typeof patch.toggles[key] === "boolean") {
        nextSettings.toggles[key] = patch.toggles[key];
      }
    }
  }

  return nextSettings;
}

async function findUserSetting(userId: string) {
  const query = new URLSearchParams();
  query.set("filters[userId][$eq]", userId);
  query.set("pagination[pageSize]", "1");

  const response = await strapiRequest<StrapiListResponse<StrapiUserSetting>>("/api/user-settings", {
    query,
    requireToken: true,
  });

  return response.data[0] ?? null;
}

async function assertProfileUserNameAvailable(userId: string, profileUserName: string) {
  const normalizedProfileUserName = profileUserName.trim();

  if (normalizedProfileUserName.length < profileUserNameMinLength) {
    throw new UserSettingsValidationError(`Username must be at least ${profileUserNameMinLength} characters long.`);
  }

  if (normalizedProfileUserName.length > profileUserNameLimit) {
    throw new UserSettingsValidationError(`Username must be ${profileUserNameLimit} characters or fewer.`);
  }

  const query = new URLSearchParams();
  query.set("filters[profileUserName][$eqi]", normalizedProfileUserName);
  query.set("pagination[pageSize]", "10");

  const response = await strapiRequest<StrapiListResponse<StrapiUserSetting>>("/api/user-settings", {
    query,
    requireToken: true,
  });

  const normalizedComparableName = normalizedProfileUserName.toLocaleLowerCase();
  const matchingOtherUser = response.data.some((setting) => {
    const fields = getStrapiEntityFields(setting);

    return (
      fields.userId !== userId &&
      typeof fields.profileUserName === "string" &&
      fields.profileUserName.trim().toLocaleLowerCase() === normalizedComparableName
    );
  });

  if (matchingOtherUser) {
    throw new UserSettingsValidationError("Username is already taken.");
  }
}

export async function getAccountSettingsForUser(userId: string, displayName = "") {
  const setting = await findUserSetting(userId);

  if (!setting) {
    return createDefaultAccountSettings(displayName);
  }

  return normalizeSettings(getStrapiEntityFields(setting), displayName);
}

export async function getAccountSettingsThemeForUser(userId: string): Promise<SettingsTheme | null> {
  const query = new URLSearchParams();
  query.set("filters[userId][$eq]", userId);
  query.set("fields[0]", "theme");
  query.set("pagination[pageSize]", "1");

  const response = await strapiRequest<StrapiListResponse<Pick<StrapiUserSetting, "theme">>>("/api/user-settings", {
    query,
    requireToken: true,
  });
  const setting = response.data[0];

  if (!setting) {
    return null;
  }

  return normalizeTheme(getStrapiEntityFields(setting).theme);
}

export async function getAccountSettingsByUserIds(userIds: string[]) {
  const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));
  const settingsByUserId = new Map<string, AccountSettings>();

  if (uniqueUserIds.length === 0) {
    return settingsByUserId;
  }

  const query = new URLSearchParams();

  uniqueUserIds.forEach((userId, index) => {
    query.set(`filters[userId][$in][${index}]`, userId);
  });
  query.set("pagination[pageSize]", String(Math.max(uniqueUserIds.length, 1)));

  const response = await strapiRequest<StrapiListResponse<StrapiUserSetting>>("/api/user-settings", {
    query,
    requireToken: true,
  });

  response.data.forEach((setting) => {
    const fields = getStrapiEntityFields(setting);

    if (fields.userId) {
      settingsByUserId.set(fields.userId, normalizeSettings(fields));
    }
  });

  return settingsByUserId;
}

export async function getAccountSettingsByProfileUserName(profileUserName: string) {
  const query = new URLSearchParams();
  query.set("filters[profileUserName][$eqi]", profileUserName);
  query.set("pagination[pageSize]", "1");

  const response = await strapiRequest<StrapiListResponse<StrapiUserSetting>>("/api/user-settings", {
    query,
    requireToken: true,
  });
  const setting = response.data[0];

  if (!setting) {
    return null;
  }

  const fields = getStrapiEntityFields(setting);

  if (!fields.userId) {
    return null;
  }

  return {
    userId: fields.userId,
    settings: normalizeSettings(fields, profileUserName),
  };
}

export async function saveAccountSettingsForUser(userId: string, patch: AccountSettingsPatch, displayName = "") {
  const existing = await findUserSetting(userId);
  const currentSettings = existing
    ? normalizeSettings(getStrapiEntityFields(existing), displayName)
    : createDefaultAccountSettings(displayName);
  const nextSettings = mergeSettings(currentSettings, patch);

  if (patch.profile && typeof patch.profile.userName === "string") {
    await assertProfileUserNameAvailable(userId, nextSettings.profile.userName);
  }

  const data = serializeSettingsPatch(userId, nextSettings, patch);

  if (existing) {
    const response = await strapiRequest<StrapiSingleResponse<StrapiUserSetting>>(
      `/api/user-settings/${getStrapiEntityId(existing as StrapiEntity<StrapiUserSetting>)}`,
      {
        method: "PUT",
        body: { data },
        requireToken: true,
      },
    );

    return normalizeSettings(response.data ? getStrapiEntityFields(response.data) : data, displayName);
  }

  const response = await strapiRequest<StrapiSingleResponse<StrapiUserSetting>>("/api/user-settings", {
    method: "POST",
    body: { data },
    requireToken: true,
  });

  return normalizeSettings(response.data ? getStrapiEntityFields(response.data) : data, displayName);
}
