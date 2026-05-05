import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
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

  const setupMessage = !isSupabaseConfigured()
    ? "Supabase is not configured yet. Create .env.local with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY."
    : params.message === "supabase-not-configured"
      ? "Supabase is not configured yet."
      : undefined;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 text-slate-900 sm:px-6 lg:px-8">
      <AuthForm initialMode={getInitialMode(params.mode)} next={next} setupMessage={setupMessage} />
    </main>
  );
}
