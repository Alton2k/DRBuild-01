import { getCurrentUser } from "@/lib/auth";
import TopNavClient from "./TopNavClient";

/**
 * Loads the current user for the shared navigation shell.
 */
export default async function TopNav() {
  const user = await getCurrentUser();

  return <TopNavClient userEmail={user?.email ?? null} />;
}
