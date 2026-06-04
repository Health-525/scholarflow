"use client";

import { useState, useEffect } from "react";
import { formatDeadlineCountdown, classifyUrgency } from "@/lib/assignment-utils";
import type { AssignmentUrgency } from "@/types";

interface DeadlineCountdownProps {
  deadline: string;
}

const URGENCY_COLORS: Record<AssignmentUrgency, string> = {
  overdue: "var(--status-error)",
  urgent: "var(--status-warning)",
  reminder: "#f59e0b",
  normal: "var(--text-tertiary)",
};

export function DeadlineCountdown({ deadline }: DeadlineCountdownProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const ms = new Date(deadline).getTime() - now.getTime();
  const urgency = classifyUrgency(deadline, now);
  const text = formatDeadlineCountdown(ms);

  return (
    <span
      className="text-xs"
      style={{ color: URGENCY_COLORS[urgency] }}
      aria-label={text}
    >
      {text}
    </span>
  );
}

export default DeadlineCountdown;
