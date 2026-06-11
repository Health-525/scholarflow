"use client";

/**
 * Loading Skeleton — 统一的骨架屏组件
 */
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-muted ${className}`}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-2xl p-5 space-y-3 bg-card border border-border dark:border-transparent shadow-sm">
      <div className="flex items-center gap-3">
        <Skeleton className="w-9 h-9 rounded-xl" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-2 w-32" />
        </div>
      </div>
      <Skeleton className="h-6 w-24" />
      <div className="flex gap-2">
        <Skeleton className="flex-1 h-1.5 rounded-full" />
        <Skeleton className="w-8 h-3" />
      </div>
    </div>
  );
}

export function ListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-12 rounded-xl" />
      ))}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="pb-24 md:pb-0 max-w-3xl mx-auto space-y-4">
      <Skeleton className="h-8 w-48" />
      <CardSkeleton />
      <CardSkeleton />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  );
}
