"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import {
  emailAuthAction,
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
  const [showPassword, setShowPassword] = useState(false);
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

      <form action={formAction} className="mt-6 space-y-4">
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
          <span className="relative block">
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              required
              minLength={6}
              autoComplete={isSignup ? "new-password" : "current-password"}
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
              placeholder="At least 6 characters"
            />
            <button
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              onClick={() => setShowPassword((current) => !current)}
              className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-50 hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
            >
              {showPassword ? (
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                >
                  <path d="m2 2 20 20" />
                  <path d="M10.58 10.58a2 2 0 0 0 2.83 2.83" />
                  <path d="M9.88 4.24A10.8 10.8 0 0 1 12 4c5 0 9 4 10 8a11.8 11.8 0 0 1-2.39 4.36" />
                  <path d="M6.61 6.61A11.8 11.8 0 0 0 2 12c1 4 5 8 10 8a10.9 10.9 0 0 0 5.39-1.39" />
                </svg>
              ) : (
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                >
                  <path d="M2 12s4-8 10-8 10 8 10 8-4 8-10 8S2 12 2 12Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </span>
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
