"use client";

import { gpaColor } from "@/lib/gpa";

interface GPARingProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
}

export function GPARing({ value, size = 140, strokeWidth = 10, label }: GPARingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(value / 4.0, 1);
  const offset = circumference * (1 - pct);

  return (
    <svg
      width={size}
      height={size}
      className="transform -rotate-90"
      role="img"
      aria-label={label || `GPA ${value.toFixed(2)} out of 4.0`}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="hsl(var(--border))"
        strokeWidth={strokeWidth}
      />
      {value > 0 && (
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={gpaColor(value)}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      )}
    </svg>
  );
}
