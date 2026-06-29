import React from "react";

interface InputFieldProps {
  label: string;
  id: string;
  name?: string;
  type?: string;
  value: string;
  placeholder?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  inputMode?: React.InputHTMLAttributes<HTMLInputElement>["inputMode"];
  autoComplete?: React.InputHTMLAttributes<HTMLInputElement>["autoComplete"];
  maxLength?: React.InputHTMLAttributes<HTMLInputElement>["maxLength"];
  extra?: React.ReactNode;
  onChange: (value: string) => void;
}

/**
 * Renders a reusable labeled input with optional helper text, error text, and extra header content.
 */
export default function InputField({
  label,
  id,
  name,
  type = "text",
  value,
  placeholder,
  hint,
  error,
  required,
  disabled,
  inputMode,
  autoComplete = "off",
  maxLength,
  extra,
  onChange,
}: InputFieldProps) {
  const describedBy = [
    hint ? `${id}-hint` : "",
    error ? `${id}-error` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="space-y-2">
      <div className="flex min-h-7 items-center justify-between gap-3">
        <label htmlFor={id} className="block text-sm font-semibold text-slate-950">
          {label}
          {required ? <span className="ml-1 text-rose-600">*</span> : null}
        </label>
        {extra ? <div className="shrink-0">{extra}</div> : null}
      </div>
      <input
        id={id}
        name={name ?? id}
        type={type}
        value={value}
        placeholder={placeholder}
        inputMode={inputMode}
        autoComplete={autoComplete}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        className={`post-form-field block h-12 w-full rounded-2xl border px-4 text-sm shadow-sm outline-none transition disabled:cursor-not-allowed disabled:opacity-80 ${
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
