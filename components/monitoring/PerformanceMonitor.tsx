"use client";

import { useEffect } from "react";

/**
 * 性能监控 & 错误上报
 *
 * 记录:
 * - LCP (Largest Contentful Paint)
 * - FCP (First Contentful Paint)
 * - 未捕获错误
 */
export function PerformanceMonitor() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // ── Web Vitals ──
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          // LCP
          if (entry.entryType === "largest-contentful-paint") {
            const lcp = (entry as any).startTime;
            if (lcp > 2500) {
              console.warn(`[Perf] LCP: ${Math.round(lcp)}ms (slow)`);
            }
          }
        }
      });
      observer.observe({ type: "largest-contentful-paint", buffered: true });
    } catch { /* ignore */ }

    // ── Unhandled errors ──
    const onError = (event: ErrorEvent) => {
      console.error("[Error]", event.message);
      // In production, send to analytics
    };
    const onUnhandled = (event: PromiseRejectionEvent) => {
      console.error("[Unhandled Promise]", event.reason);
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandled);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandled);
    };
  }, []);

  return null;
}
