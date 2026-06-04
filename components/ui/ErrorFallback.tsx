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
      className="rounded-2xl p-4 flex flex-col items-center gap-3 text-center"
      style={{
        backgroundColor: "rgba(255, 59, 48, 0.06)",
        border: "1px solid rgba(255, 59, 48, 0.18)",
      }}
      role="alert"
    >
      <span className="text-2xl" aria-hidden="true">
        ⚠️
      </span>
      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
        {message}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="px-4 py-2 rounded-xl text-sm font-medium active:scale-95 transition-transform"
          style={{ backgroundColor: "var(--accent)", color: "#fff" }}
        >
          重试
        </button>
      )}
    </div>
  );
}

export default ErrorFallback;
