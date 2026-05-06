import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import AuthForm from "./AuthForm";
import type { AuthMode } from "./actions";

export const metadata = {
  title: "Log in | DealMY",
  description: "Log in or create an account for Deal Rakyat.",
};

function getSafeNext(value: string | string[] | undefined) {
  const next = Array.isArray(value) ? value[0] : value;
  return next?.startsWith("/") && !next.startsWith("//") ? next : "/";
}

function getInitialMode(value: string | string[] | undefined): AuthMode {
  return value === "signup" ? "signup" : "login";
}

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{
    mode?: string;
    next?: string;
    message?: string;
  }>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();
  const next = getSafeNext(params.next);

  if (user) {
    redirect(next);
  }

  const setupMessage =
    params.message === "google-not-configured"
      ? "Google login is not configured yet. Use email and password."
      : params.message === "email-confirmed"
        ? "Email verified. You can log in now."
      : undefined;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 text-slate-900 sm:px-6 lg:px-8">
      <AuthForm initialMode={getInitialMode(params.mode)} next={next} setupMessage={setupMessage} />
    </main>
  );
}
