import { getCurrentUser } from "@/lib/auth";
import { dealCategories } from "@/lib/categories";
import TopNavClient from "./TopNavClient";

/**
 * Loads the current user for the shared navigation shell.
 */
export default async function TopNav() {
  const user = await getCurrentUser();

  return (
    <TopNavClient
      categories={dealCategories}
      userEmail={user?.email ?? null}
      userName={user?.user_metadata.name ?? user?.email ?? null}
    />
  );
}
