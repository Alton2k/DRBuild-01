"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  createSiteAccessToken,
  getSafeSiteAccessNext,
  getSiteAccessSettings,
  matchesSiteAccessPin,
  SITE_ACCESS_COOKIE,
  SITE_ACCESS_SESSION_SECONDS,
} from "@/lib/siteAccess";

export type SiteAccessActionState = {
  message: string;
};

const invalidCodeDelayMs = 700;

export async function unlockSite(
  _previousState: SiteAccessActionState,
  formData: FormData,
): Promise<SiteAccessActionState> {
  const settings = getSiteAccessSettings();
  if (!settings.enabled || !settings.configured) {
    return { message: "Development access is not configured. Ask the site owner to check Vercel." };
  }

  const submittedPin = String(formData.get("accessCode") ?? "");
  if (!submittedPin) {
    return { message: "Enter the private access code." };
  }

  if (!(await matchesSiteAccessPin(submittedPin, settings.pin))) {
    await new Promise((resolve) => setTimeout(resolve, invalidCodeDelayMs));
    return { message: "That access code is not correct." };
  }

  const token = await createSiteAccessToken(settings.secret);
  const cookieStore = await cookies();
  cookieStore.set(SITE_ACCESS_COOKIE, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SITE_ACCESS_SESSION_SECONDS,
    priority: "high",
  });

  redirect(getSafeSiteAccessNext(String(formData.get("next") ?? "/")));
}
