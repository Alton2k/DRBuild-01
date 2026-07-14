"use client";

import { useEffect, useId, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  pending = false,
  onCancel,
  onConfirm,
  returnFocusRef,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  pending?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  returnFocusRef?: RefObject<HTMLElement | null>;
}) {
  const [mounted, setMounted] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const id = useId();
  const titleId = `confirm-title-${id}`;
  const descriptionId = `${titleId}-description`;

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setMounted(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!mounted || !open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    cancelRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) {
        event.preventDefault();
        onCancel();
        window.requestAnimationFrame(() => returnFocusRef?.current?.focus());
        return;
      }
      if (event.key !== "Tab") return;
      const controls = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>("button:not([disabled])") ?? []);
      if (controls.length === 0) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (!dialogRef.current?.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [mounted, onCancel, open, pending, returnFocusRef]);

  if (!mounted || !open) return null;

  const cancel = () => {
    if (pending) return;
    onCancel();
    window.requestAnimationFrame(() => returnFocusRef?.current?.focus());
  };

  return createPortal(
    <div className="app-dialog-overlay fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6" onMouseDown={(event) => { if (event.target === event.currentTarget) cancel(); }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId} className="post-discard-dialog w-full max-w-md rounded-3xl border p-5 shadow-2xl sm:p-6">
        <h2 id={titleId} className="text-xl font-bold tracking-tight text-slate-950">{title}</h2>
        <p id={descriptionId} className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button ref={cancelRef} type="button" onClick={cancel} disabled={pending} className="post-secondary-button inline-flex h-12 items-center justify-center rounded-full border px-5 text-sm font-bold disabled:opacity-60">Cancel</button>
          <button type="button" onClick={onConfirm} disabled={pending} className="inline-flex h-12 items-center justify-center rounded-full bg-rose-600 px-5 text-sm font-bold text-white transition hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-200 disabled:cursor-wait disabled:opacity-60">{pending ? "Deleting…" : confirmLabel}</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
