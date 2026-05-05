"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import {
  emailAuthAction,
  googleSignInAction,
  type AuthActionState,
  type AuthMode,
} from "./actions";

const initialState: AuthActionState = {
  ok: false,
  message: "",
};

export default function AuthForm({
  initialMode,
  next,
  setupMessage,
}: {
  initialMode: AuthMode;
  next: string;
  setupMessage?: string;
}) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const action = useMemo(() => emailAuthAction.bind(null, mode), [mode]);
  const [state, formAction, isPending] = useActionState(action, initialState);
  const isSignup = mode === "signup";

  return (
    <div className="mx-auto w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
          {isSignup ? "Create account" : "Welcome back"}
        </p>
        <h1 className="text-3xl font-semibold text-slate-950">
          {isSignup ? "Join Deal Rakyat" : "Log in to Deal Rakyat"}
        </h1>
        <p className="text-sm leading-6 text-slate-600">
          {isSignup
            ? "Create an account to post deals and build a trustworthy history."
            : "Sign in to post deals and access your account."}
        </p>
      </div>

      {setupMessage ? (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {setupMessage}
        </div>
      ) : null}

      {state.message ? (
        <div
          className={`mt-5 rounded-2xl border px-4 py-3 text-sm ${
            state.ok
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
          role="status"
        >
          {state.message}
        </div>
      ) : null}

      <form action={googleSignInAction} className="mt-6">
        <input type="hidden" name="next" value={next} />
        <button
          type="submit"
          className="inline-flex h-12 w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-slate-50"
        >
          Continue with Google
        </button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-slate-200" />
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
          or
        </span>
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-slate-900">Email</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
            placeholder="you@example.com"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-semibold text-slate-900">Password</span>
          <input
            name="password"
            type="password"
            required
            minLength={6}
            autoComplete={isSignup ? "new-password" : "current-password"}
            className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
            placeholder="At least 6 characters"
          />
        </label>

        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {isPending ? "Working..." : isSignup ? "Create account" : "Log in"}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-slate-600">
        {isSignup ? "Already have an account?" : "New here?"}{" "}
        <button
          type="button"
          onClick={() => setMode(isSignup ? "login" : "signup")}
          className="font-semibold text-slate-950 hover:underline"
        >
          {isSignup ? "Log in" : "Create one"}
        </button>
      </div>

      <div className="mt-5 text-center">
        <Link href="/" className="text-sm font-semibold text-slate-500 hover:text-slate-900">
          Back to deals
        </Link>
      </div>
    </div>
  );
}
