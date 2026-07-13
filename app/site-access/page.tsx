import type { Metadata } from "next";
import { getSafeSiteAccessNext, getSiteAccessSettings } from "@/lib/siteAccess";
import AccessForm from "./AccessForm";

export const metadata: Metadata = {
  title: "Private preview",
  description: "Private development access for Deal Rakyat.",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
};

export default async function SiteAccessPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const settings = getSiteAccessSettings();

  return (
    <main className="auth-page flex min-h-screen items-center px-4 py-10 text-slate-900 sm:px-6 lg:px-8">
      <section className="mx-auto w-full max-w-md" aria-labelledby="site-access-title">
        <div className="auth-card overflow-hidden rounded-3xl border shadow-sm">
          <div className="auth-card-header px-5 py-6 sm:px-6">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Private preview</p>
            <h1 id="site-access-title" className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              Deal Rakyat is under development
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Enter the owner access code to continue. Access expires after 15 minutes.
            </p>
          </div>

          <div className="px-5 py-6 sm:px-6">
            <AccessForm next={getSafeSiteAccessNext(params.next)} configured={settings.enabled && settings.configured} />
          </div>
        </div>

        <p className="mt-5 text-center text-xs leading-5 text-slate-500">
          This preview is not open to the public yet.
        </p>
      </section>
    </main>
  );
}
