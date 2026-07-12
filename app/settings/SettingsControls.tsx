"use client";

import type { ReactNode } from "react";

function EditIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" />
    </svg>
  );
}

export function TextInput({
  label,
  value,
  onChange,
  type = "text",
  disabled = false,
  size = "default",
  maxLength,
  minLength,
  showEditIcon = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  disabled?: boolean;
  size?: "default" | "compact";
  maxLength?: number;
  minLength?: number;
  showEditIcon?: boolean;
}) {
  const id = label.toLowerCase().replace(/\s+/g, "-");
  const sizeClassName =
    size === "compact"
      ? `settings-underline-field h-10 rounded-none border-0 border-b px-0 shadow-none ${showEditIcon ? "pr-8" : ""}`
      : "h-12 rounded-2xl px-4";

  return (
    <label htmlFor={id} className="block space-y-2">
      <span className="text-sm font-bold text-slate-950">{label}</span>
      <span className="relative block">
        <input
          id={id}
          type={type}
          value={value}
          disabled={disabled}
          maxLength={maxLength}
          minLength={minLength}
          onChange={(event) => onChange(event.target.value)}
          className={`post-form-field w-full border text-sm shadow-sm outline-none disabled:opacity-75 ${sizeClassName}`}
        />
        {showEditIcon ? (
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400">
            <EditIcon />
          </span>
        ) : null}
      </span>
    </label>
  );
}

export function StaticField({ label, value }: { label: string; value: string }) {
  return (
    <div className="block space-y-2">
      <p className="text-sm font-bold text-slate-950">{label}</p>
      <p className="settings-static-field min-h-10 border-b border-slate-300 py-2 text-sm font-semibold text-slate-700">
        {value}
      </p>
    </div>
  );
}

export function NotificationToggle({
  enabled,
  onChange,
  label,
  description,
  disabled = false,
}: {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  label: string;
  description: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-5 py-4">
      <div className="min-w-0">
        <p className="text-sm font-bold text-slate-950">{label}</p>
        <p className="mt-1 max-w-2xl text-sm leading-5 text-slate-500">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        disabled={disabled}
        onClick={() => onChange(!enabled)}
        className="relative flex h-11 w-12 shrink-0 items-center rounded-full transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dc115e]/20 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span
          aria-hidden="true"
          className={`relative block h-7 w-12 rounded-full p-1 shadow-inner transition ${
            enabled ? "bg-[#dc115e]" : "bg-slate-200"
          }`}
        >
          <span
            className={`block h-5 w-5 rounded-full bg-white shadow-sm transition ${
              enabled ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </span>
      </button>
    </div>
  );
}

export function SmallButton({
  children,
  variant = "secondary",
  onClick,
  disabled = false,
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "danger";
  onClick?: () => void;
  disabled?: boolean;
}) {
  const className =
    variant === "primary"
      ? "bg-[#dc115e] text-white hover:bg-[#c80f55]"
      : variant === "danger"
        ? "border border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300 hover:bg-rose-100"
        : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:text-slate-950";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-bold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {children}
    </button>
  );
}
