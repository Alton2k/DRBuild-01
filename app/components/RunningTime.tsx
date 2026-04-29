'use client';

import { useEffect, useMemo, useState } from 'react';

function formatRelativeTime(seconds: number) {
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface RunningTimeProps {
  timestamp: string;
}

export default function RunningTime({ timestamp }: RunningTimeProps) {
  const targetTime = useMemo(() => new Date(timestamp).getTime(), [timestamp]);
  const [label, setLabel] = useState(() => {
    const diffInSeconds = Math.max(0, Math.floor((Date.now() - targetTime) / 1000));
    return formatRelativeTime(diffInSeconds);
  });

  useEffect(() => {
    const tick = () => {
      const diffInSeconds = Math.max(0, Math.floor((Date.now() - targetTime) / 1000));
      setLabel(formatRelativeTime(diffInSeconds));
    };

    const interval = window.setInterval(tick, 60000);
    tick();

    return () => window.clearInterval(interval);
  }, [targetTime]);

  return <span className="text-xs font-medium text-slate-500">{label}</span>;
}
