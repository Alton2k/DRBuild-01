import { AppUser, getCurrentUser, isAdminUser } from "@/lib/auth";
import { dealCategories } from "@/lib/categories";
import TopNavClient from "./TopNavClient";

/**
 * Loads the current user for the shared navigation shell.
 */
export default async function TopNav({
  initialThemeMode,
  initialUser,
}: {
  initialThemeMode?: "auto" | "dark" | "light";
  initialUser?: AppUser | null;
}) {
  const user = initialUser === undefined ? await getCurrentUser() : initialUser;

  return (
    <TopNavClient
      categories={dealCategories}
      initialThemeMode={initialThemeMode}
      isAdmin={isAdminUser(user)}
      userEmail={user?.email ?? null}
      userName={user?.user_metadata.name ?? user?.email ?? null}
    />
  );
}
