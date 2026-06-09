"use client";

import { useState, useEffect, useRef } from "react";
import { formatCountdown } from "@/lib/schedule/timezone";

interface CountdownTimerProps {
  targetTime: Date;
  label?: string;
  onExpire?: () => void;
}

export function CountdownTimer({ targetTime, label, onExpire }: CountdownTimerProps) {
  const [now, setNow] = useState(() => new Date());
  const expiredRef = useRef(false);

  useEffect(() => {
    // Already expired at mount
    if (new Date() >= targetTime) {
      if (!expiredRef.current) {
        expiredRef.current = true;
        onExpire?.();
      }
      return;
    }

    const id = setInterval(() => {
      const current = new Date();
      setNow(current);
      if (current >= targetTime && !expiredRef.current) {
        expiredRef.current = true;
        onExpire?.();
        clearInterval(id);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [targetTime, onExpire]);

  const ms = targetTime.getTime() - now.getTime();
  const text = formatCountdown(ms);

  return (
    <span aria-label={label ? `${label}: ${text}` : text} aria-live="polite">
      {text}
    </span>
  );
}

export default CountdownTimer;
