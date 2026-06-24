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
        className={`post-form-field block w-full rounded-2xl border px-4 py-3 text-sm leading-6 shadow-sm outline-none transition disabled:cursor-not-allowed disabled:opacity-80 ${
          error
            ? "post-form-field-error"
            : ""
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
