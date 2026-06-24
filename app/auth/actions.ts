"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getStrapiUrl } from "@/lib/strapi";
import { strapiAuthCookieName } from "@/lib/auth";

export type AuthMode = "login" | "signup";

export type AuthActionState = {
  ok: boolean;
  message: string;
};

type StrapiAuthResponse = {
  jwt: string;
  user: {
    id: number;
    username?: string;
    email?: string;
  };
};

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getAuthRedirectPath(formData: FormData) {
  const next = getString(formData, "next");
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

function getUsername(email: string) {
  return email.split("@")[0]?.replace(/[^a-z0-9_-]/gi, "") || "member";
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function strapiAuthRequest(mode: AuthMode, email: string, password: string) {
  const endpoint = mode === "signup" ? "/api/auth/local/register" : "/api/auth/local";
  const body =
    mode === "signup"
      ? {
          username: getUsername(email),
          email,
          password,
        }
      : {
          identifier: email,
          password,
        };

  let response: Response;

  try {
    response = await fetch(`${getStrapiUrl()}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    return {
      ok: false as const,
      message: "Could not connect to Strapi. Start the backend with npm.cmd run backend:dev.",
    };
  }

  const responseBody = await response.json().catch(() => null);

  if (!response.ok) {
    const fallbackMessage = mode === "signup" ? "Could not create this account." : "Invalid email or password.";

    return {
      ok: false as const,
      message:
        mode === "signup" && typeof responseBody?.error?.message === "string"
          ? responseBody.error.message
          : fallbackMessage,
    };
  }

  const authData = responseBody as StrapiAuthResponse;

  if (!authData.jwt) {
    return {
      ok: false as const,
      message: "Strapi did not return an auth token.",
    };
  }

  return {
    ok: true as const,
    data: authData,
  };
}

export async function emailAuthAction(
  mode: AuthMode,
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = getString(formData, "email").toLowerCase();
  const password = getString(formData, "password");
  const next = getAuthRedirectPath(formData);

  if (!email || !password) {
    return { ok: false, message: "Email and password are required." };
  }

  if (!isValidEmail(email)) {
    return { ok: false, message: "Enter a valid email address." };
  }

  if (password.length < 6) {
    return { ok: false, message: "Password must be at least 6 characters." };
  }

  if (mode === "signup" && (!/\d/.test(password) || !/[^A-Za-z0-9]/.test(password))) {
    return { ok: false, message: "Password must include a number and a symbol." };
  }

  const result = await strapiAuthRequest(mode, email, password);

  if (!result.ok) {
    return { ok: false, message: result.message };
  }

  const cookieStore = await cookies();
  cookieStore.set(strapiAuthCookieName, result.data.jwt, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });

  redirect(next);
}

export async function googleSignInAction() {
  redirect("/auth?message=google-not-configured");
}

export async function signOutAction() {
  (await cookies()).delete(strapiAuthCookieName);
  redirect("/");
}
