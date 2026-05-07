import React from "react";

interface TextareaFieldProps {
  label: string;
  id: string;
  name?: string;
  value: string;
  placeholder?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  rows?: number;
  onChange: (value: string) => void;
}

/**
 * Renders a reusable labeled textarea with optional helper text and validation feedback.
 */
export default function TextareaField({
  label,
  id,
  name,
  value,
  placeholder,
  hint,
  error,
  required,
  disabled,
  rows = 5,
  onChange,
}: TextareaFieldProps) {
  const describedBy = [
    hint ? `${id}-hint` : "",
    error ? `${id}-error` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-semibold text-slate-950">
        {label}
        {required ? <span className="ml-1 text-rose-600">*</span> : null}
      </label>
      <textarea
        id={id}
        name={name ?? id}
        value={value}
        placeholder={placeholder}
        rows={rows}
        onChange={(event) => onChange(event.target.value)}
        className={`block w-full rounded-2xl border px-4 py-3 text-sm leading-6 text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus-visible:bg-white focus-visible:ring-4 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 disabled:opacity-80 ${
          error
            ? "border-rose-300 bg-rose-50 focus-visible:border-rose-400 focus-visible:ring-rose-100"
            : "border-slate-200 bg-slate-50 hover:border-slate-300 focus-visible:border-slate-500 focus-visible:ring-slate-200"
        }`}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy || undefined}
        required={required}
        disabled={disabled}
      />
      <div className="space-y-1 text-sm leading-5">
        {hint ? <p id={`${id}-hint`} className="text-slate-500">{hint}</p> : null}
        {error ? (
          <p id={`${id}-error`} className="font-semibold text-rose-700">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
