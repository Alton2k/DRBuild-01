import "server-only";

import { cookies } from "next/headers";
import { getStrapiAccessHeaders, getStrapiToken, getStrapiUrl } from "./strapi";

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
