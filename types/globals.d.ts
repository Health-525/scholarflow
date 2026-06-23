/**
 * Global type declarations for ScholarFlow
 */

// Electron preload API
interface UpdateInfo {
  version: string;
  releaseNotes?: string | { note: string }[];
}

interface DownloadProgress {
  percent: number;
  bytesPerSecond: number;
}

interface ElectronAPI {
  isElectron: boolean;
  getInternalToken: () => Promise<string | null>;
  encryptAndStoreToken: (token: string) => Promise<boolean>;
  retrieveToken: () => Promise<string | null>;
  clearToken: () => Promise<boolean>;
  getActiveWindow: () => Promise<{ title: string; app: string; timestamp: number } | null>;
  onActiveWindowChanged: (callback: (info: { title: string; app: string; timestamp: number }) => void) => () => void;
  onSystemStateChanged: (callback: (info: { state: 'idle' | 'locked' | 'sleep' | 'resumed'; timestamp: number; idleMs?: number; reason?: string }) => void) => () => void;
  updateCheck: () => Promise<{ currentVersion: string; latestVersion: string | null; error?: string }>;
  updateDownload: () => Promise<boolean | { error: string }>;
  updateInstall: () => Promise<void>;
  onUpdateAvailable: (callback: (info: UpdateInfo) => void) => () => void;
  onUpdateDownloadProgress: (callback: (progress: DownloadProgress) => void) => () => void;
  onUpdateDownloaded: (callback: (info: { version: string }) => void) => () => void;
  onUpdateError: (callback: (err: { message: string }) => void) => () => void;
  setTitleBarOverlay: (options: { color?: string; symbolColor?: string; height?: number }) => Promise<boolean>;
  // Local-first-sync credential APIs (exposed by preload, task 6.2)
  storeCredential?: (plaintext: string) => Promise<boolean>;
  retrieveCredential?: () => Promise<string | null>;
  clearCredential?: () => Promise<boolean>;
  secureStorageAvailable?: () => Promise<boolean>;
  // Auth state secure storage (replaces plaintext localStorage sf_auth)
  storeAuthState?: (plaintext: string) => Promise<boolean>;
  retrieveAuthState?: () => Promise<string | null>;
  clearAuthState?: () => Promise<boolean>;
  // Activity data secure storage (replaces plaintext localStorage sf_activity_v3)
  storeActivityData?: (plaintext: string) => Promise<boolean>;
  retrieveActivityData?: () => Promise<string | null>;
  clearActivityData?: () => Promise<boolean>;
}

interface Window {
  electronAPI?: ElectronAPI;
}
