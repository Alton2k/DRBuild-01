"use client";

import { useEffect, useRef, type ReactNode } from "react";

export default function CloseOnOutsideDetails({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const closeOnOutsidePointerDown = (event: PointerEvent) => {
      const details = detailsRef.current;

      if (!details?.open || !event.target || details.contains(event.target as Node)) {
        return;
      }

      details.open = false;
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      const details = detailsRef.current;

      if (event.key === "Escape" && details?.open) {
        details.open = false;
      }
    };

    document.addEventListener("pointerdown", closeOnOutsidePointerDown);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointerDown);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  return (
    <details ref={detailsRef} className={className}>
      {children}
    </details>
  );
}
