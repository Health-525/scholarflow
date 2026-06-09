"use client";

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
      className="rounded-2xl p-4 flex flex-col items-center gap-3 text-center bg-red-500/6 border border-red-500/18"
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
