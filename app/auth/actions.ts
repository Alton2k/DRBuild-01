"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export type AuthMode = "login" | "signup";

export type AuthActionState = {
  ok: boolean;
  message: string;
};

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getAuthRedirectPath(formData: FormData) {
  const next = getString(formData, "next");
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

async function getOrigin() {
  const headerStore = await headers();
  return headerStore.get("origin") ?? "http://localhost:3000";
}

export async function emailAuthAction(
  mode: AuthMode,
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      message: "Supabase is not configured yet. Add your Supabase URL and publishable key to .env.local.",
    };
  }

  const email = getString(formData, "email");
  const password = getString(formData, "password");
  const next = getAuthRedirectPath(formData);

  if (!email || !password) {
    return { ok: false, message: "Email and password are required." };
  }

  if (password.length < 6) {
    return { ok: false, message: "Password must be at least 6 characters." };
  }

  const supabase = await createClient();
  const origin = await getOrigin();

  if (mode === "signup") {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });

    if (error) {
      return { ok: false, message: error.message };
    }

    return {
      ok: true,
      message: "Account created. Check your email if confirmation is enabled, then sign in.",
    };
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { ok: false, message: error.message };
  }

  redirect(next);
}

export async function googleSignInAction(formData: FormData) {
  if (!isSupabaseConfigured()) {
    redirect("/auth?message=supabase-not-configured");
  }

  const supabase = await createClient();
  const origin = await getOrigin();
  const next = getAuthRedirectPath(formData);
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error || !data.url) {
    redirect(`/auth?message=${encodeURIComponent(error?.message ?? "Could not start Google sign in.")}`);
  }

  redirect(data.url);
}

export async function signOutAction() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }

  redirect("/");
}
