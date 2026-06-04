"use client";

interface ProgressBarProps {
  value: number; // 0~100
  label?: string;
  showPercent?: boolean;
  color?: string;
  height?: number;
}

export function ProgressBar({
  value,
  label,
  showPercent = false,
  color,
  height = 8,
}: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div className="w-full">
      {(label || showPercent) && (
        <div className="flex justify-between items-center mb-1">
          {label && (
            <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
              {label}
            </span>
          )}
          {showPercent && (
            <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
              {Math.round(clamped)}%
            </span>
          )}
        </div>
      )}
      <div
        className="sf-progress-track"
        style={{ height }}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className="sf-progress-fill"
          style={{
            width: `${clamped}%`,
            ...(color ? { background: color } : {}),
          }}
        />
      </div>
    </div>
  );
}

export default ProgressBar;
