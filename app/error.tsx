"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Route error", error);
  }, [error]);

  return (
    <main className="home-page flex min-h-[55vh] items-center px-4 py-10 sm:px-6 lg:px-8">
      <section className="mx-auto w-full max-w-xl text-center">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-rose-600">Page unavailable</p>
        <h1 className="mt-3 text-2xl font-black text-slate-950">We couldn’t load this page</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">Check your connection and try again. Your browser may still retain unsent form drafts.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={reset} className="post-primary-button inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-bold">Try again</button>
          <Link href="/" className="post-secondary-button inline-flex h-11 items-center justify-center rounded-full border px-5 text-sm font-bold">Go home</Link>
        </div>
      </section>
    </main>
  );
}
