import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { StrapiRequestError } from "@/lib/strapi";
import { saveAccountSettingsForUser } from "@/lib/userSettings";

function getDisplayName(user: Awaited<ReturnType<typeof getCurrentUser>>) {
  return user?.user_metadata.full_name ?? user?.user_metadata.name ?? user?.email ?? "";
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const settings = await saveAccountSettingsForUser(user.id, body && typeof body === "object" ? body : {}, getDisplayName(user));

    return NextResponse.json({ settings });
  } catch (error) {
    const strapiStatus = error instanceof StrapiRequestError ? error.status : undefined;
    const message =
      strapiStatus === 404
        ? "Strapi user-settings API is not available. Restart the Strapi backend so the new user-setting content type is registered."
        : error instanceof Error
          ? error.message
          : "Unable to save settings";

    return NextResponse.json({ error: message }, { status: strapiStatus === 404 ? 503 : 500 });
  }
}
