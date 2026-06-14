"use client";

import { useState, useEffect } from "react";

export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);

    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    if (mq.addEventListener) {
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
    // Fallback for older browsers
    mq.addListener(handler);
    return () => mq.removeListener(handler);
  }, []);

  return reduced;
}

export default usePrefersReducedMotion;
