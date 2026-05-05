import "server-only";

import type { User } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "./supabase/config";
import { createClient } from "./supabase/server";

export async function getCurrentUser(): Promise<User | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

export async function requireCurrentUser() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("You must be signed in.");
  }

  return user;
}

export function getAdminEmails() {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminUser(user: User | null) {
  const email = user?.email?.toLowerCase();

  if (!email) {
    return false;
  }

  return getAdminEmails().includes(email);
}

export async function requireAdminUser() {
  const user = await requireCurrentUser();

  if (!isAdminUser(user)) {
    throw new Error("You must be an admin to do this.");
  }

  return user;
}
