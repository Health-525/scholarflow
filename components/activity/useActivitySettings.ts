"use client";

import { useEffect, useState } from "react";

export function useActivitySettings() {
  const [settings, setSettings] = useState<ActivitySettings | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    const api = window.electronAPI;
    if (!api?.getActivitySettings) return;
    setLoading(true);
    try {
      const s = await api.getActivitySettings();
      setSettings(s);
    } catch { /* silently ignored */ }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function update(patch: Partial<ActivitySettings>) {
    const api = window.electronAPI;
    if (!api?.updateActivitySettings) return;
    try { setSettings(await api.updateActivitySettings(patch)); } catch { /* silently ignored */ }
  }

  async function togglePaused() {
    const api = window.electronAPI;
    if (!api?.toggleActivityPaused) return;
    try { setSettings(await api.toggleActivityPaused()); } catch { /* silently ignored */ }
  }

  return { settings, loading, update, togglePaused, reload: load };
}
