import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createDefaultAccountSettings } from "@/lib/accountSettings";
import { getAccountSettingsForUser } from "@/lib/userSettings";
import SettingsClient from "./SettingsClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Account Settings | Deal Rakyat",
  description: "Manage your Deal Rakyat account, security, and notifications.",
};

function getDisplayName(user: Awaited<ReturnType<typeof getCurrentUser>>) {
  return user?.user_metadata.full_name ?? user?.user_metadata.name ?? user?.email ?? "Deal Rakyat member";
}

export default async function SettingsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth?mode=login&next=/settings");
  }

  const displayName = getDisplayName(user);
  const settings = await getAccountSettingsForUser(user.id, displayName).catch(() =>
    createDefaultAccountSettings(displayName),
  );

  return (
    <SettingsClient
      user={{
        id: user.id,
        email: user.email ?? "",
        displayName,
        joinedAt: user.joinedAt ?? "",
      }}
      initialSettings={settings}
    />
  );
}
