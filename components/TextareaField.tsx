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
  rows = 5,
  onChange,
}: TextareaFieldProps) {
  return (
    <div className="space-y-3">
      <label htmlFor={id} className="block text-sm font-semibold text-slate-900">
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
        className={`block w-full rounded-2xl border px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 ${
          error ? "border-rose-300 bg-rose-50" : "border-slate-200 bg-white"
        }`}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        required={required}
      />
      <div className="space-y-1 text-sm">
        {hint ? <p className="text-slate-500">{hint}</p> : null}
        {error ? (
          <p id={`${id}-error`} className="text-rose-600">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
