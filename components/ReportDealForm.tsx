"use client";

import { useActionState } from "react";
import { reportDealAction, type ReportDealActionState } from "@/app/actions";

const initialState: ReportDealActionState = {
  ok: false,
  message: "",
};

export default function ReportDealForm({ dealId }: { dealId: string }) {
  const reportAction = reportDealAction.bind(null, dealId);
  const [state, formAction, isPending] = useActionState(reportAction, initialState);

  return (
    <form action={formAction} className="mt-3 flex flex-col gap-3">
      <label className="sr-only" htmlFor="report-reason">
        Report reason
      </label>
      <select
        id="report-reason"
        name="reason"
        defaultValue=""
        required
        disabled={isPending}
        className="deal-detail-report-select min-h-11 rounded-md border px-4 text-sm font-medium shadow-sm outline-none transition"
      >
        <option value="" disabled>Choose a reason</option>
        <option value="expired">Already expired</option>
        <option value="bad-price">Price is wrong</option>
        <option value="bad-link">Link does not work</option>
        <option value="spam">Spam or unsafe</option>
      </select>
      <button
        type="submit"
        disabled={isPending}
        className="deal-detail-primary-action inline-flex h-11 items-center justify-center rounded-md px-4 text-sm font-bold transition disabled:cursor-wait disabled:opacity-60"
      >
        {isPending ? "Reporting…" : "Report"}
      </button>
      {state.message ? (
        <p
          className={`theme-alert px-3 py-2 text-xs font-semibold leading-5 ${
            state.ok
              ? "theme-alert-success"
              : "theme-alert-warning"
          }`}
          aria-live="polite"
        >
          {!state.ok ? (
            <span className="theme-alert-symbol mr-1.5" aria-hidden="true">
              {"\u26A0"}
            </span>
          ) : null}
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
