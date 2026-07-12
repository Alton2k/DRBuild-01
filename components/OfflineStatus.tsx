"use client";

import { useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getSnapshot() {
  return navigator.onLine;
}

export default function OfflineStatus() {
  const isOnline = useSyncExternalStore(subscribe, getSnapshot, () => true);
  if (isOnline) return null;

  return (
    <div className="sticky top-0 z-[60] border-b border-amber-300 bg-amber-100 px-4 py-2 text-center text-sm font-bold text-amber-950" role="status" aria-live="polite">
      You’re offline. Your unsent form text stays in this browser; reconnect before submitting or retrying.
    </div>
  );
}
