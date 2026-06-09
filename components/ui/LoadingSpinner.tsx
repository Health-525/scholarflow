"use client";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  label?: string;
}

export function LoadingSpinner({ size = "md", label = "加载中" }: LoadingSpinnerProps) {
  const sizeClass = {
    sm: "w-4 h-4 border-2",
    md: "w-6 h-6 border-2",
    lg: "w-8 h-8 border-[3px]",
  }[size];

  return (
    <div className="flex items-center justify-center gap-2" role="status" aria-label={label}>
      <div
        className={`${sizeClass} rounded-full animate-spin border-border border-t-primary`}
        aria-hidden="true"
      />
      <span className="text-sm text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

export default LoadingSpinner;
