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
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
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
  inputMode,
  extra,
  onChange,
}: InputFieldProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 min-h-[1.75rem]">
        <label htmlFor={id} className="block text-sm font-semibold text-slate-900">
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
