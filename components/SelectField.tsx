import React from "react";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps {
  label: string;
  id: string;
  name?: string;
  value: string;
  options: SelectOption[];
  hint?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  onChange: (value: string) => void;
}

/**
 * Renders a reusable labeled select field with options, validation state, and optional hint text.
 */
export default function SelectField({
  label,
  id,
  name,
  value,
  options,
  hint,
  error,
  required,
  disabled,
  onChange,
}: SelectFieldProps) {
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
      <select
        id={id}
        name={name ?? id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`block h-12 w-full rounded-2xl border px-4 text-sm shadow-sm outline-none transition focus-visible:bg-white focus-visible:ring-4 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 disabled:opacity-80 ${
          error
            ? "border-rose-300 bg-rose-50 text-slate-950 focus-visible:border-rose-400 focus-visible:ring-rose-100"
            : value
            ? "border-slate-200 bg-slate-50 text-slate-950 hover:border-slate-300 focus-visible:border-slate-500 focus-visible:ring-slate-200"
            : "border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300 focus-visible:border-slate-500 focus-visible:ring-slate-200"
        }`}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy || undefined}
        required={required}
        disabled={disabled}
      >
        <option value="" disabled>
          Choose an option
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value} className="text-slate-900">
            {option.label}
          </option>
        ))}
      </select>
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
