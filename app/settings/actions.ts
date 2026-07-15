"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { changeCurrentUserPassword, getCurrentUser, strapiAuthCookieName } from "@/lib/auth";
import { checkViewerAndIpRateLimit, getClientIp } from "@/lib/abusePrevention";
import type { AccountSettings } from "@/lib/accountSettings";
import { displayNameLimit, profileBioLimit } from "@/lib/accountSettings";
import {
  saveAccountSettingsForUser,
  type AccountSettingsPatch,
  UserSettingsValidationError,
} from "@/lib/userSettings";

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

const avatarDataUrlLimit = 450_000;

class SettingsValidationError extends Error {}

function getDisplayName(user: Awaited<ReturnType<typeof getCurrentUser>>) {
  return user?.user_metadata.full_name ?? user?.user_metadata.name ?? user?.email ?? "";
}

function validateSettingsPatch(patch: AccountSettingsPatch): AccountSettingsPatch {
  const nextPatch: AccountSettingsPatch = {};

  if (patch.profile) {
    const profile: NonNullable<AccountSettingsPatch["profile"]> = {};

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

export async function saveAccountSettingsAction(patch: AccountSettingsPatch): Promise<SaveAccountSettingsActionResult> {
  const user = await getCurrentUser();

  if (!user) {
    return {
      ok: false,
      message: "Please log in before saving settings.",
    };
  }

  try {
    const settings = await saveAccountSettingsForUser(user.id, validateSettingsPatch(patch), getDisplayName(user));

    revalidatePath("/profile");
    revalidatePath("/settings");
    revalidatePath("/");
    revalidatePath("/deal/[id]", "page");

    return {
      ok: true,
      message: "Settings saved.",
      settings,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof SettingsValidationError || error instanceof UserSettingsValidationError
          ? error.message
          : "Unable to save settings.",
    };
  }
}

export async function changePasswordAction(input: {
  currentPassword: string;
  password: string;
  passwordConfirmation: string;
}): Promise<ChangePasswordActionResult> {
  const user = await getCurrentUser();

  if (!user) {
    return { ok: false, field: "form", message: "Please log in again before changing your password." };
  }

  const ip = await getClientIp();
  if (!checkViewerAndIpRateLimit("password", user.id, ip, 5, 15 * 60)) {
    return { ok: false, field: "form", message: "Too many password attempts. Try again in 15 minutes." };
  }

  const result = await changeCurrentUserPassword(input);
  if (!result.ok) return result;

  (await cookies()).set(strapiAuthCookieName, result.jwt, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });

  return { ok: true, message: "Password changed. Your current session has been refreshed." };
}
