import "server-only";

import { cookies } from "next/headers";
import { getStrapiAccessHeaders, getStrapiToken, getStrapiUrl } from "./strapi";
import { validatePasswordChange } from "./accountSettings";
import {
  createPasswordRateLimitProof,
  getPasswordRateLimitRetryMessage,
} from "./passwordRateLimitProof";

export const strapiAuthCookieName = "dealmy_strapi_jwt";

export interface AppUser {
  id: string;
  email?: string;
  joinedAt?: string;
  user_metadata: {
    name?: string;
    full_name?: string;
  };
}

type StrapiMeResponse = {
  id: number;
  username?: string;
  email?: string;
  createdAt?: string;
};

type StrapiPublicUserResponse = Pick<StrapiMeResponse, "id" | "username" | "email" | "createdAt">;

export async function getStrapiJwt() {
  return (await cookies()).get(strapiAuthCookieName)?.value ?? "";
}

export async function getCurrentUser(): Promise<AppUser | null> {
  const jwt = await getStrapiJwt();

  if (!jwt) {
    return null;
  }

  try {
    const response = await fetch(`${getStrapiUrl()}/api/users/me`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${jwt}`,
        ...getStrapiAccessHeaders(),
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const user = (await response.json()) as StrapiMeResponse;

    return {
      id: String(user.id),
      email: user.email,
      ...(user.createdAt ? { joinedAt: user.createdAt } : {}),
      user_metadata: {
        name: user.username ?? user.email,
        full_name: user.username ?? user.email,
      },
    };
  } catch {
    return null;
  }
}

export async function requireCurrentUser() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("You must be signed in.");
  }

  return user;
}

export async function getPublicUserDisplayName(userId: string) {
  const user = await getPublicUserById(userId);

  return user?.displayName ?? "";
}

export async function getPublicUserById(userId: string) {
  const token = getStrapiToken();

  if (!token) {
    return null;
  }

  try {
    const response = await fetch(`${getStrapiUrl()}/api/users/${encodeURIComponent(userId)}`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        ...getStrapiAccessHeaders(),
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const user = (await response.json()) as StrapiPublicUserResponse;

    return {
      id: String(user.id),
      displayName: user.username ?? user.email ?? "",
      joinedAt: user.createdAt ?? "",
    };
  } catch {
    return null;
  }
}

export async function getPublicUserByUsername(username: string) {
  const token = getStrapiToken();

  if (!token) {
    return null;
  }

  try {
    const url = new URL(`${getStrapiUrl()}/api/users`);
    url.searchParams.set("filters[username][$eq]", username);
    url.searchParams.set("pagination[pageSize]", "1");

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        ...getStrapiAccessHeaders(),
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const users = (await response.json()) as StrapiPublicUserResponse[];
    const user = users[0];

    if (!user) {
      return null;
    }

    return {
      id: String(user.id),
      displayName: user.username ?? user.email ?? "",
      joinedAt: user.createdAt ?? "",
    };
  } catch {
    return null;
  }
}

export function getAdminEmails() {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminUser(user: AppUser | null) {
  const email = user?.email?.toLowerCase();

  return Boolean(email && getAdminEmails().includes(email));
}

export async function requireAdminUser() {
  const user = await requireCurrentUser();

  if (!isAdminUser(user)) {
    throw new Error("You must be an admin to do this.");
  }

  return user;
}

export type ChangePasswordResult =
  | { ok: true; jwt: string }
  | {
      ok: false;
      field: "currentPassword" | "password" | "passwordConfirmation" | "form";
      message: string;
    };

export async function changeCurrentUserPassword(input: {
  currentPassword?: unknown;
  password?: unknown;
  passwordConfirmation?: unknown;
}, rateLimitContext: {
  accountId: string;
  ipAddress: string;
}): Promise<ChangePasswordResult> {
  const validated = validatePasswordChange(input);

  if (!validated.ok) {
    return validated;
  }

  const jwt = await getStrapiJwt();

  if (!jwt) {
    return { ok: false, field: "form", message: "You must be signed in." };
  }

  let response: Response;

  try {
    const rateLimitHeaders = createPasswordRateLimitProof({
      secret: process.env.PASSWORD_RATE_LIMIT_SECRET,
      accountId: rateLimitContext.accountId,
      ipAddress: rateLimitContext.ipAddress,
    });

    response = await fetch(`${getStrapiUrl()}/api/auth/change-password`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
        ...getStrapiAccessHeaders(),
        ...rateLimitHeaders,
      },
      body: JSON.stringify({
        currentPassword: validated.currentPassword,
        password: validated.password,
        passwordConfirmation: validated.passwordConfirmation,
      }),
      cache: "no-store",
    });
  } catch {
    return { ok: false, field: "form", message: "Unable to process the password change. Please try again later." };
  }

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 429) {
      return {
        ok: false,
        field: "form",
        message: getPasswordRateLimitRetryMessage(response.headers.get("retry-after")),
      };
    }

    const message = typeof body?.error?.message === "string" ? body.error.message : "Could not change your password.";
    const currentPasswordError = /current password|invalid/i.test(message);

    return {
      ok: false,
      field: currentPasswordError ? "currentPassword" : "form",
      message: currentPasswordError ? "Your current password is incorrect." : message,
    };
  }

  if (typeof body?.jwt !== "string" || !body.jwt) {
    return { ok: false, field: "form", message: "The account service did not return a new session." };
  }

  return { ok: true, jwt: body.jwt };
}
