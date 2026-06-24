"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import type { AccountSettings } from "@/lib/accountSettings";
import { profileBioLimit, profileUserNameLimit, profileUserNameMinLength } from "@/lib/accountSettings";
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

    if (typeof patch.profile.userName === "string") {
      const userName = patch.profile.userName.trim();

      if (userName.length > profileUserNameLimit) {
        throw new SettingsValidationError(`Username must be ${profileUserNameLimit} characters or fewer.`);
      }

      if (userName.length < profileUserNameMinLength) {
        throw new SettingsValidationError(`Username must be at least ${profileUserNameMinLength} characters long.`);
      }

      profile.userName = userName;
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
    nextPatch.toggles = patch.toggles;
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
