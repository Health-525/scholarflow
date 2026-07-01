import { useState, useEffect } from "react";

/**
 * Returns `false` during SSR and becomes `true` after the first client-side
 * useEffect fires.  Timing is identical to the
 * `const [mounted, setMounted] = useState(false)` +
 * `useEffect(() => { setMounted(true); }, [])` pattern used across components.
 */
export function useIsClient(): boolean {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return isClient;
}
