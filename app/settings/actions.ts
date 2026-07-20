"use server";

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { changeCurrentUserPassword, getCurrentUser, strapiAuthCookieName } from "@/lib/auth";
import { selectTrustedPasswordClientIp } from "@/lib/passwordRateLimitProof";
import {
  createSettingsActionOperations,
  type ChangePasswordActionResult,
  type SaveAccountSettingsActionResult,
} from "@/lib/settingsActionOperations";
import {
  saveAccountSettingsForUser,
  type AccountSettingsPatch,
  UserSettingsValidationError,
} from "@/lib/userSettings";

const settingsOperations = createSettingsActionOperations({
  getCurrentUser,
  saveSettings: saveAccountSettingsForUser,
  changePassword: async (input, user) => {
    const requestHeaders = await headers();
    return changeCurrentUserPassword(input, {
      accountId: user.id,
      ipAddress: selectTrustedPasswordClientIp(
        (name) => requestHeaders.get(name),
        process.env.NODE_ENV === "production",
      ),
    });
  },
  async setAuthCookie(jwt) {
    (await cookies()).set(strapiAuthCookieName, jwt, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
  },
  revalidate: revalidatePath,
  isPersistenceValidationError: (error) => error instanceof UserSettingsValidationError,
});

export async function saveAccountSettingsAction(patch: AccountSettingsPatch): Promise<SaveAccountSettingsActionResult> {
  return settingsOperations.saveAccountSettings(patch);
}

export async function changePasswordAction(input: {
  currentPassword: string;
  password: string;
  passwordConfirmation: string;
}): Promise<ChangePasswordActionResult> {
  return settingsOperations.changePassword(input);
}
