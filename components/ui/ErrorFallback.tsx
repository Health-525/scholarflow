"use client";

import { Button } from "@/components/ui/button";
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
        <Button onClick={onRetry}>
          重试
        </Button>
      )}
    </div>
  );
}

export default ErrorFallback;
