"use client";

import React, { useEffect, useRef, useState } from "react";

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
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedOption = options.find((option) => option.value === value);
  const describedBy = [
    hint ? `${id}-hint` : "",
    error ? `${id}-error` : "",
  ]
    .filter(Boolean)
    .join(" ");
  const firstEnabledIndex = required && options.length > 0 ? 1 : 0;
  const lastOptionIndex = options.length;

  const focusOption = (index: number) => {
    const bounded = Math.min(lastOptionIndex, Math.max(firstEnabledIndex, index));
    window.requestAnimationFrame(() => optionRefs.current[bounded]?.focus());
  };

  const openFromKeyboard = (direction: "first" | "last" | "selected") => {
    const selectedIndex = value ? options.findIndex((option) => option.value === value) + 1 : firstEnabledIndex;
    setIsOpen(true);
    focusOption(direction === "first" ? firstEnabledIndex : direction === "last" ? lastOptionIndex : Math.max(firstEnabledIndex, selectedIndex));
  };

  const chooseValue = (nextValue: string) => {
    onChange(nextValue);
    setIsOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen]);

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-semibold text-slate-950">
        {label}
        {required ? <span className="ml-1 text-rose-600">*</span> : null}
      </label>
      <div ref={containerRef} className="relative">
        <input type="hidden" name={name ?? id} value={value} />
        <button
          ref={triggerRef}
          id={id}
          type="button"
          onClick={() => {
            if (!disabled) {
              setIsOpen((current) => !current);
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setIsOpen(false);
            } else if (event.key === "ArrowDown") {
              event.preventDefault();
              openFromKeyboard("first");
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              openFromKeyboard("last");
            } else if ((event.key === "Enter" || event.key === " ") && !isOpen) {
              event.preventDefault();
              openFromKeyboard("selected");
            }
          }}
          className={`post-form-field post-select-field flex h-12 w-full items-center rounded-2xl border px-4 pr-14 text-left text-sm shadow-sm outline-none transition disabled:cursor-not-allowed disabled:opacity-80 ${
            error
              ? "post-form-field-error"
              : value
              ? ""
              : "text-slate-500"
          }`}
          aria-describedby={describedBy || undefined}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-controls={isOpen ? `${id}-options` : undefined}
          disabled={disabled}
        >
          <span className="min-w-0 truncate">{selectedOption?.label ?? "Choose an option"}</span>
        </button>
        <span
          aria-hidden="true"
          className="post-select-caret pointer-events-none absolute bottom-1 right-1 top-1 flex w-10 items-center justify-center rounded-xl"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.2"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
        {isOpen ? (
          <div
            id={`${id}-options`}
            role="listbox"
            aria-labelledby={id}
            onKeyDown={(event) => {
              const currentIndex = optionRefs.current.findIndex((option) => option === document.activeElement);
              if (event.key === "Escape") {
                event.preventDefault();
                setIsOpen(false);
                triggerRef.current?.focus();
              } else if (event.key === "ArrowDown") {
                event.preventDefault();
                focusOption(currentIndex < lastOptionIndex ? currentIndex + 1 : firstEnabledIndex);
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                focusOption(currentIndex > firstEnabledIndex ? currentIndex - 1 : lastOptionIndex);
              } else if (event.key === "Home") {
                event.preventDefault();
                focusOption(firstEnabledIndex);
              } else if (event.key === "End") {
                event.preventDefault();
                focusOption(lastOptionIndex);
              }
            }}
            className="post-select-menu absolute left-0 right-0 top-[calc(100%+0.45rem)] z-30 max-h-72 overflow-auto rounded-2xl border p-1 shadow-2xl"
          >
            <button
              ref={(element) => { optionRefs.current[0] = element; }}
              type="button"
              role="option"
              aria-selected={!value}
              disabled={required}
              onClick={() => chooseValue("")}
              className="post-select-menu-option w-full rounded-xl px-3 py-2.5 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              Choose an option
            </button>
            {options.map((option, index) => (
              <button
                ref={(element) => { optionRefs.current[index + 1] = element; }}
                key={option.value}
                type="button"
                role="option"
                aria-selected={option.value === value}
                onClick={() => chooseValue(option.value)}
                className="post-select-menu-option w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition"
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
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
