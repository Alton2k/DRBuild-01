"use client";

import { useEffect, useMemo, useState } from "react";

const oneDayMs = 24 * 60 * 60 * 1000;

function formatTimePart(value: number) {
  return String(value).padStart(2, "0");
}

function formatCountdown(diffMs: number) {
  const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${formatTimePart(hours)}:${formatTimePart(minutes)}:${formatTimePart(seconds)}`;
}

export default function ExpirationTime({
  expiresAt,
  fallback,
  expiredLabel = "Expired",
}: {
  expiresAt: string;
  fallback: string;
  expiredLabel?: string;
}) {
  const targetTime = useMemo(() => new Date(expiresAt).getTime(), [expiresAt]);
  const [now, setNow] = useState(() => Date.now());
  const diffMs = targetTime - now;

  useEffect(() => {
    if (!Number.isFinite(targetTime)) {
      return undefined;
    }

    let interval: number | undefined;
    const tick = () => {
      const currentTime = Date.now();
      setNow(currentTime);

      if (currentTime >= targetTime && interval !== undefined) {
        window.clearInterval(interval);
        interval = undefined;
      }
    };

    tick();

    if (Date.now() < targetTime) {
      interval = window.setInterval(tick, 1000);
    }

    return () => {
      if (interval !== undefined) {
        window.clearInterval(interval);
      }
    };
  }, [targetTime]);

  if (!Number.isFinite(targetTime)) {
    return fallback;
  }

  if (diffMs <= 0) {
    return expiredLabel;
  }

  if (diffMs <= oneDayMs) {
    return (
      <span className="expiration-countdown-urgent">
        Ends in {formatCountdown(diffMs)}
      </span>
    );
  }

  return fallback;
}
