import "server-only";

import {
  AccountSettings,
  SettingsTheme,
  StoredProfileSettings,
  ToggleKey,
  createDefaultAccountSettings,
  defaultToggles,
  normalizeTheme,
  displayNameLimit,
  assertImmutableProfileHandle,
} from "./accountSettings";
import {
  StrapiEntity,
  StrapiListResponse,
  StrapiSingleResponse,
  StrapiRequestError,
  getStrapiEntityFields,
  getStrapiEntityId,
  strapiRequest,
} from "./strapi";
import {
  isValidUserHandle,
  createUserHandleCandidate,
  normalizeUserHandle,
  stripUserHandlePrefix,
  userHandleMaxLength,
} from "./userHandles";

type StrapiUserSetting = {
  userId: string;
  ownerUsername?: string | null;
  ownerEmail?: string | null;
  avatarUrl?: string | null;
  displayName?: string | null;
  username?: string | null;
  bio?: string | null;
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

type UserSettingOwner = {
  ownerUsername?: string;
  email?: string;
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
  const fallback = createDefaultAccountSettings(displayName, createUserHandleCandidate(displayName));
  const storedUserName =
    typeof fields.username === "string" && fields.username
      ? fields.username
      : fallback.profile.userName;
  const storedDisplayName =
    typeof fields.displayName === "string" && fields.displayName
      ? fields.displayName
      : displayName || storedUserName;

  return {
    profile: {
      avatarUrl: typeof fields.avatarUrl === "string" ? fields.avatarUrl : fallback.profile.avatarUrl,
      displayName: storedDisplayName,
      userName: storedUserName,
      bio: typeof fields.bio === "string" ? fields.bio : fallback.profile.bio,
    },
    theme: normalizeTheme(fields.theme),
    toggles: {
      ...fallback.toggles,
      ...normalizeToggleGroup(fields.notificationSettings),
      ...normalizeToggleGroup(fields.privacySettings),
    },
  };
}

function serializeSettingsPatch(
  userId: string,
  settings: AccountSettings,
  patch: AccountSettingsPatch,
  options: { includeUserName?: boolean } = {},
): StrapiUserSetting {
  const data: StrapiUserSetting = { userId };

  if (patch.profile) {
    if (typeof patch.profile.avatarUrl === "string") {
      data.avatarUrl = settings.profile.avatarUrl;
    }

    if (typeof patch.profile.displayName === "string") {
      data.displayName = settings.profile.displayName;
    }

    if (typeof patch.profile.userName === "string") {
      data.username = settings.profile.userName;
    }

    if (typeof patch.profile.bio === "string") {
      data.bio = settings.profile.bio;
    }
  }

  if (patch.theme !== undefined) {
    data.theme = settings.theme;
  }

  if (options.includeUserName && settings.profile.userName) {
    data.username = settings.profile.userName;
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

    if (typeof patch.profile.displayName === "string") {
      const displayName = patch.profile.displayName.trim();

      if (displayName.length > displayNameLimit) {
        throw new UserSettingsValidationError(`Display name must be ${displayNameLimit} characters or fewer.`);
      }

      nextSettings.profile.displayName = displayName;
    }

    if (typeof patch.profile.userName === "string") {
      nextSettings.profile.userName = normalizeUserHandle(patch.profile.userName);
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

function isUniqueConstraintError(error: unknown) {
  return (
    error instanceof StrapiRequestError &&
    (error.status === 400 || error.status === 409) &&
    /unique|duplicate/i.test(error.message)
  );
}

async function getProfileUserNameOwner(username: string) {
  const query = new URLSearchParams();
  query.set("filters[username][$eqi]", normalizeUserHandle(username));
  query.set("pagination[pageSize]", "1");

  const response = await strapiRequest<StrapiListResponse<StrapiUserSetting>>("/api/user-settings", {
    query,
    requireToken: true,
  });
  const setting = response.data[0];

  return setting ? getStrapiEntityFields(setting).userId : "";
}

async function createUniqueProfileUserName(userId: string, preferredUserName: string) {
  const base = createUserHandleCandidate(preferredUserName);
  const owner = await getProfileUserNameOwner(base);

  if (!owner || owner === userId) {
    return base;
  }

  const suffix = `_${userId}`;
  const candidate = createUserHandleCandidate(`${base.slice(0, userHandleMaxLength - suffix.length)}${suffix}`);
  const candidateOwner = await getProfileUserNameOwner(candidate);

  return !candidateOwner || candidateOwner === userId
    ? candidate
    : createUserHandleCandidate(`${base.slice(0, Math.max(0, userHandleMaxLength - suffix.length - 2))}_${Date.now().toString(36).slice(-1)}${suffix}`);
}

export type PublicProfileSearchResult = {
  userId: string;
  userName: string;
  displayName: string;
  avatarUrl: string;
  bio: string;
};

export async function getAccountSettingsForUser(userId: string, displayName = "") {
  const setting = await findUserSetting(userId);

  if (!setting) {
    return createDefaultAccountSettings(displayName, createUserHandleCandidate(displayName));
  }

  return normalizeSettings(getStrapiEntityFields(setting), displayName);
}

export async function ensureAccountSettingsForUser(
  userId: string,
  displayName = "",
  preferredUserName = displayName,
  owner: UserSettingOwner = {},
) {
  const existing = await findUserSetting(userId);
  const ownerUsername = owner.ownerUsername?.trim() ?? "";
  const ownerEmail = owner.email?.trim() ?? "";

  if (existing) {
    const fields = getStrapiEntityFields(existing);
    const needsOwnerUpdate =
      (ownerUsername && fields.ownerUsername !== ownerUsername) ||
      (ownerEmail && fields.ownerEmail !== ownerEmail);

    if (fields.username && fields.displayName && !needsOwnerUpdate) {
      return normalizeSettings(fields, displayName);
    }

    const settings = normalizeSettings(fields, displayName);
    const data: StrapiUserSetting = {
      userId,
      ...(fields.username ? {} : { username: await createUniqueProfileUserName(userId, preferredUserName) }),
      ...(fields.displayName ? {} : { displayName: displayName || settings.profile.displayName }),
      ...(ownerUsername && fields.ownerUsername !== ownerUsername ? { ownerUsername } : {}),
      ...(ownerEmail && fields.ownerEmail !== ownerEmail ? { ownerEmail } : {}),
    };

    const response = await strapiRequest<StrapiSingleResponse<StrapiUserSetting>>(
      `/api/user-settings/${getStrapiEntityId(existing as StrapiEntity<StrapiUserSetting>)}`,
      {
        method: "PUT",
        body: { data },
        requireToken: true,
      },
    );

    return normalizeSettings(response.data ? getStrapiEntityFields(response.data) : { ...fields, ...data }, displayName);
  }

  const username = await createUniqueProfileUserName(userId, preferredUserName);
  const profileDisplayName = displayName || preferredUserName || username;
  let response: StrapiSingleResponse<StrapiUserSetting>;

  try {
    response = await strapiRequest<StrapiSingleResponse<StrapiUserSetting>>("/api/user-settings", {
      method: "POST",
      body: {
        data: {
          userId,
          ...(ownerUsername ? { ownerUsername } : {}),
          ...(ownerEmail ? { ownerEmail } : {}),
          username,
          displayName: profileDisplayName,
        },
      },
      requireToken: true,
    });
  } catch (error) {
    if (!isUniqueConstraintError(error)) {
      throw error;
    }

    const setting = await findUserSetting(userId);

    if (!setting) {
      throw error;
    }

    return normalizeSettings(getStrapiEntityFields(setting), profileDisplayName);
  }

  return normalizeSettings(
    response.data ? getStrapiEntityFields(response.data) : { userId, username, displayName: profileDisplayName },
    profileDisplayName,
  );
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

export async function getAccountSettingsByProfileUserName(username: string) {
  const normalizedProfileUserName = normalizeUserHandle(username);
  const query = new URLSearchParams();
  query.set("filters[username][$eqi]", normalizedProfileUserName || stripUserHandlePrefix(username));
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
    settings: normalizeSettings(fields, normalizedProfileUserName || username),
  };
}

export async function searchPublicProfiles(searchTerm: string, limit = 6): Promise<PublicProfileSearchResult[]> {
  const rawQuery = stripUserHandlePrefix(searchTerm);
  const normalizedQuery = normalizeUserHandle(searchTerm);
  const queryValue = normalizedQuery || rawQuery;

  if (queryValue.length < 2) {
    return [];
  }

  const query = new URLSearchParams();
  query.set("filters[$or][0][username][$containsi]", queryValue);
  query.set("filters[$or][1][displayName][$containsi]", rawQuery || queryValue);
  query.set("sort", "username:asc");
  query.set("pagination[pageSize]", String(Math.max(limit * 3, limit)));

  const response = await strapiRequest<StrapiListResponse<StrapiUserSetting>>("/api/user-settings", {
    query,
    requireToken: true,
  });

  return response.data
    .map((setting) => getStrapiEntityFields(setting))
    .filter((fields) => {
      const settings = normalizeSettings(fields);

      return Boolean(
        fields.userId &&
        settings.toggles.publicProfile &&
        fields.username &&
        isValidUserHandle(fields.username),
      );
    })
    .slice(0, limit)
    .map((fields) => {
      const settings = normalizeSettings(fields);

      return {
        userId: fields.userId,
        userName: normalizeUserHandle(settings.profile.userName),
        displayName: settings.profile.displayName,
        avatarUrl: settings.profile.avatarUrl,
        bio: settings.profile.bio,
      };
    });
}

export async function saveAccountSettingsForUser(userId: string, patch: AccountSettingsPatch, displayName = "") {
  const existing = await findUserSetting(userId);
  const existingFields = existing ? getStrapiEntityFields(existing) : null;
  const currentSettings = existing
    ? normalizeSettings(existingFields ?? {}, displayName)
    : createDefaultAccountSettings(displayName, createUserHandleCandidate(displayName));

  assertImmutableProfileHandle(currentSettings.profile.userName, patch.profile?.userName);
  const nextSettings = mergeSettings(currentSettings, patch);

  const data = serializeSettingsPatch(userId, nextSettings, patch, {
    includeUserName: !existing || !existingFields?.username,
  });

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
