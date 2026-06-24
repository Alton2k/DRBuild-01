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
  const [password, setPassword] = useState("");
  const action = useMemo(() => emailAuthAction.bind(null, mode), [mode]);
  const [state, formAction, isPending] = useActionState(action, initialState);
  const isSignup = mode === "signup";
  const passwordMeetsSignupRequirements =
    password.length >= 6 && /\d/.test(password) && /[^A-Za-z0-9]/.test(password);
  const showPasswordRequirement = isSignup && password.length > 0 && !passwordMeetsSignupRequirements;
  const submitDisabled = isPending || showPasswordRequirement;

  return (
    <section className="mx-auto w-full max-w-md">
      <div className="auth-card overflow-hidden rounded-3xl border shadow-sm">
        <div className="auth-card-header px-5 py-5 sm:px-6">
          <div className="auth-mode-tabs grid grid-cols-2 gap-1 rounded-full border p-1">
            {(["login", "signup"] as AuthMode[]).map((option) => {
              const selected = mode === option;

              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setMode(option)}
                  aria-pressed={selected}
                  className={`h-11 rounded-full text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dc115e]/20 ${
                    selected
                      ? "auth-mode-tab-active shadow-sm"
                      : "auth-mode-tab-idle"
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
          </div>
        </div>

        <div className="space-y-5 px-5 py-5 sm:px-6 sm:py-6">
          {setupMessage ? (
            <div
              className="theme-alert theme-alert-warning px-4 py-3 text-sm leading-6"
              role="status"
            >
              <span className="theme-alert-symbol mr-1.5" aria-hidden="true">
                {"\u26A0"}
              </span>
              {setupMessage}
            </div>
          ) : null}

          {state.message ? (
            <div
              className={`theme-alert px-4 py-3 text-sm leading-6 ${
                state.ok
                  ? "theme-alert-success"
                  : "theme-alert-error"
              }`}
              role="status"
              aria-live="polite"
            >
              <p className="font-semibold">
                {!state.ok ? (
                  <span className="theme-alert-symbol mr-1.5" aria-hidden="true">
                    {"\u26A0"}
                  </span>
                ) : null}
                {state.ok ? "Done" : "Could not continue"}
              </p>
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
                  className="auth-input h-12 w-full rounded-2xl border px-4 text-sm shadow-sm outline-none transition disabled:cursor-not-allowed disabled:opacity-80"
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
                    className="auth-input h-12 w-full rounded-2xl border px-4 pr-12 text-sm shadow-sm outline-none transition disabled:cursor-not-allowed disabled:opacity-80"
                    placeholder={isSignup ? "At least 6 characters" : "Your password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 transition hover:bg-white hover:text-slate-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dc115e]/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <EyeIcon hidden={showPassword} />
                  </button>
                </span>
                {showPasswordRequirement ? (
                  <span className="block text-xs font-medium leading-5 text-rose-700">
                    Password must be at least 6 characters long and include a number and a symbol.
                  </span>
                ) : null}
              </label>
            </fieldset>

            {isSignup ? (
              <p className="text-xs leading-5 text-slate-500">
                By registering an account, I have read and agreed with the{" "}
                <Link
                  href="/terms"
                  className="font-semibold text-slate-950 underline-offset-4 hover:underline"
                >
                  Terms and Conditions
                </Link>{" "}
                and{" "}
                <Link
                  href="/privacy"
                  className="font-semibold text-slate-950 underline-offset-4 hover:underline"
                >
                  Privacy Policy
                </Link>
                .
              </p>
            ) : null}

            <button
              type="submit"
              disabled={submitDisabled}
              className="auth-submit-button inline-flex h-12 w-full items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold shadow-sm transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dc115e]/20 disabled:cursor-not-allowed disabled:opacity-60"
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

        <div className="auth-card-footer px-5 py-4 text-center text-sm text-slate-600 sm:px-6">
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
