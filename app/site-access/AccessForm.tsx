"use client";

import { useActionState, useState } from "react";
import { unlockSite, type SiteAccessActionState } from "./actions";

const initialState: SiteAccessActionState = { message: "" };

function SpinnerIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 animate-spin" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-90" d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeLinecap="round" strokeWidth="3" />
    </svg>
  );
}

export default function AccessForm({ next, configured }: { next: string; configured: boolean }) {
  const [state, formAction, isPending] = useActionState(unlockSite, initialState);
  const [accessCode, setAccessCode] = useState("");
  const errorId = state.message ? "site-access-error" : undefined;

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="next" value={next} />
      <fieldset disabled={isPending || !configured} className="space-y-5">
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-slate-950">Private access code</span>
          <input
            name="accessCode"
            type="password"
            required
            autoComplete="current-password"
            inputMode="text"
            spellCheck={false}
            value={accessCode}
            onChange={(event) => setAccessCode(event.target.value)}
            aria-invalid={Boolean(errorId)}
            aria-describedby={errorId}
            className="auth-input h-12 w-full rounded-2xl border px-4 text-sm shadow-sm outline-none transition disabled:cursor-not-allowed disabled:opacity-70"
            placeholder="Enter access code"
          />
        </label>
      </fieldset>

      {state.message ? (
        <p id={errorId} className="auth-inline-error text-sm font-semibold leading-5" role="alert" aria-live="polite">
          {state.message}
        </p>
      ) : null}

      {!configured ? (
        <p className="theme-alert theme-alert-warning px-4 py-3 text-sm leading-6" role="alert">
          Access is temporarily unavailable while the deployment configuration is completed.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending || !configured || accessCode.length === 0}
        className="auth-submit-button inline-flex h-12 w-full items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold shadow-sm transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dc115e]/20 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? (
          <><SpinnerIcon />Checking code</>
        ) : (
          "Continue to Deal Rakyat"
        )}
      </button>
    </form>
  );
}
