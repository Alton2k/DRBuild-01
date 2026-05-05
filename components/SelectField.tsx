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
  onChange,
}: SelectFieldProps) {
  return (
    <div className="space-y-3">
      <label htmlFor={id} className="block text-sm font-semibold text-slate-900">
        {label}
        {required ? <span className="ml-1 text-rose-600">*</span> : null}
      </label>
      <select
        id={id}
        name={name ?? id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`block w-full rounded-2xl border bg-white px-4 py-3 text-sm shadow-sm transition focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 ${
          error ? "border-rose-300 bg-rose-50 text-slate-900" : value ? "border-slate-200 text-slate-900" : "border-slate-200 text-slate-400"
        }`}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        required={required}
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
