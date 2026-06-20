/**
 * Runtime environment detection for local-first-sync.
 *
 * Determines the runtime form factor (Electron vs Web) and whether OS-level
 * secure storage is available, which together gate the "remember password"
 * capability.
 *
 * @see design.md §1 lib/runtime-env.ts
 * Requirements: 9.1, 9.2, 9.5
 */

/**
 * Pure predicate: remember-password is supported only in Electron with
 * encryption available.
 *
 * Requirements: 9.5
 */
export function rememberPasswordSupported(env: { electron: boolean; secure: boolean }): boolean {
  return env.electron === true && env.secure === true;
}

/**
 * Detect whether we are running inside the Electron renderer.
 *
 * Requirements: 9.1, 9.2
 */
export function isElectron(): boolean {
  return typeof window !== "undefined" && window.electronAPI?.isElectron === true;
}

/**
 * Query the Electron main process (via the preload bridge) for whether
 * `safeStorage.isEncryptionAvailable()` returns true.
 *
 * Returns false in non-Electron environments, when the IPC method is not
 * exposed, or when the call throws.
 *
 * Note: `window.electronAPI.secureStorageAvailable` is exposed by the preload
 * layer (task 6.2); this function calls it per the agreed contract.
 *
 * Requirements: 9.1, 9.5
 */
export async function isSecureStorageAvailable(): Promise<boolean> {
  try {
    if (!isElectron()) return false;
    const api = window.electronAPI;
    if (typeof api?.secureStorageAvailable !== "function") return false;
    return (await api.secureStorageAvailable()) === true;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[RuntimeEnv] secureStorageAvailable failed:", e);
    return false;
  }
}
