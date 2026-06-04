"use client";

interface OfflineBannerProps {
  isOnline?: boolean;
}

export function OfflineBanner({ isOnline = true }: OfflineBannerProps) {
  if (isOnline) return null;

  return (
    <div
      className="w-full px-4 py-2 text-center text-sm font-medium z-50"
      style={{
        backgroundColor: "var(--status-warning)",
        color: "#fff",
      }}
      role="status"
      aria-live="polite"
    >
      📶 当前处于离线模式，数据可能不是最新
    </div>
  );
}

export default OfflineBanner;
