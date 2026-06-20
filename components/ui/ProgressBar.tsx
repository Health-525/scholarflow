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
            <span className="text-xs text-muted-foreground">
              {label}
            </span>
          )}
          {showPercent && (
            <span className="text-xs font-medium text-foreground">
              {Math.round(clamped)}%
            </span>
          )}
        </div>
      )}
      <div
        className="w-full rounded-full bg-secondary overflow-hidden"
        style={{ height }}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
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
