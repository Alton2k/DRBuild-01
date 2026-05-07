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

function EyeIcon({ hidden }: { hidden: boolean }) {
  return hidden ? (
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
  );
}

function SpinnerIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 animate-spin" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" />
      <path
        className="opacity-90"
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="3"
      />
    </svg>
  );
}

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
    <section className="mx-auto w-full max-w-md">
      <div className="mb-5 text-center">
        <Link
          href="/"
          className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200"
        >
          Deal Rakyat
        </Link>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
          <div className="grid grid-cols-2 gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1">
            {(["login", "signup"] as AuthMode[]).map((option) => {
              const selected = mode === option;

              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setMode(option)}
                  aria-pressed={selected}
                  className={`h-11 rounded-xl text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200 ${
                    selected
                      ? "bg-white text-slate-950 shadow-sm ring-1 ring-slate-200"
                      : "text-slate-600 hover:bg-white/70 hover:text-slate-950"
                  }`}
                >
                  {option === "login" ? "Log in" : "Register"}
                </button>
              );
            })}
          </div>

          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              {isSignup ? "Create account" : "Account access"}
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              {isSignup ? "Join Deal Rakyat" : "Welcome back"}
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {isSignup
                ? "Create an account to post deals and keep your submission history tied to you."
                : "Sign in to continue posting and managing your Deal Rakyat activity."}
            </p>
          </div>
        </div>

        <div className="space-y-5 px-5 py-5 sm:px-6 sm:py-6">
          {setupMessage ? (
            <div
              className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950"
              role="status"
            >
              {setupMessage}
            </div>
          ) : null}

          {state.message ? (
            <div
              className={`rounded-2xl border px-4 py-3 text-sm leading-6 ${
                state.ok
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : "border-rose-200 bg-rose-50 text-rose-900"
              }`}
              role="status"
              aria-live="polite"
            >
              <p className="font-semibold">{state.ok ? "Done" : "Could not continue"}</p>
              <p className="mt-0.5">{state.message}</p>
            </div>
          ) : null}

          <form action={formAction} className="space-y-5">
            <input type="hidden" name="next" value={next} />
            <fieldset disabled={isPending} className="space-y-5">
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-slate-950">Email</span>
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus-visible:border-slate-500 focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 disabled:opacity-80"
                  placeholder="you@example.com"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-semibold text-slate-950">Password</span>
                <span className="relative block">
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    autoComplete={isSignup ? "new-password" : "current-password"}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 pr-12 text-sm text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus-visible:border-slate-500 focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 disabled:opacity-80"
                    placeholder={isSignup ? "At least 6 characters" : "Your password"}
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 transition hover:bg-white hover:text-slate-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <EyeIcon hidden={showPassword} />
                  </button>
                </span>
                <span className="block text-xs leading-5 text-slate-500">
                  {isSignup ? "Use a password you do not use on other sites." : "Your session is kept in a secure cookie."}
                </span>
              </label>
            </fieldset>

            <button
              type="submit"
              disabled={isPending}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isPending ? (
                <>
                  <SpinnerIcon />
                  {isSignup ? "Creating account" : "Signing in"}
                </>
              ) : isSignup ? (
                "Create account"
              ) : (
                "Log in"
              )}
            </button>
          </form>
        </div>

        <div className="border-t border-slate-200 bg-slate-50 px-5 py-4 text-center text-sm text-slate-600 sm:px-6">
          {isSignup ? "Already have an account?" : "New to Deal Rakyat?"}{" "}
          <button
            type="button"
            onClick={() => setMode(isSignup ? "login" : "signup")}
            className="font-semibold text-slate-950 hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200"
          >
            {isSignup ? "Log in" : "Register"}
          </button>
        </div>
      </div>

      <p className="mt-5 text-center text-xs leading-5 text-slate-500">
        Accounts help keep deal submissions accountable and easier to moderate.
      </p>
    </section>
  );
}
