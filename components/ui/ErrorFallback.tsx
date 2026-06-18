"use client";

import { semanticBg, semanticBorder } from "@/lib/theme-colors";

interface ErrorFallbackProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorFallback({
  message = "加载失败，请稍后重试",
  onRetry,
}: ErrorFallbackProps) {
  return (
    <div
      className="rounded-2xl p-4 flex flex-col items-center gap-3 text-center border"
      style={{ backgroundColor: semanticBg("error"), borderColor: semanticBorder("error") }}
      role="alert"
    >
      <span className="text-2xl" aria-hidden="true">
        ⚠️
      </span>
      <p className="text-sm text-muted-foreground">
        {message}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="px-4 py-2 rounded-xl text-sm font-medium active:scale-95 transition-transform bg-primary text-primary-foreground"
        >
          重试
        </button>
      )}
    </div>
  );
}

export default ErrorFallback;
