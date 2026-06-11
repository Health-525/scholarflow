/**
 * Global type declarations for ScholarFlow
 */

// Electron preload API
interface ElectronAPI {
  isElectron: boolean;
  encryptAndStoreToken: (token: string) => Promise<boolean>;
  retrieveToken: () => Promise<string | null>;
  clearToken: () => Promise<boolean>;
  libraryRefreshJWT: () => Promise<{ ok: boolean; expiry?: string; error?: string; message?: string }>;
  libraryLogin: () => Promise<{ ok: boolean; message?: string }>;
  onLibraryJWTExpired: (callback: () => void) => () => void;
  onLibraryJWTRefreshed: (callback: (data: { ok: boolean; expiry?: string }) => void) => () => void;
  getActiveWindow: () => Promise<{ title: string; app: string; timestamp: number } | null>;
  onActiveWindowChanged: (callback: (info: { title: string; app: string; timestamp: number }) => void) => () => void;
  updateCheck: () => Promise<{ currentVersion: string; latestVersion: string | null; error?: string }>;
  updateDownload: () => Promise<boolean | { error: string }>;
  updateInstall: () => void;
  onUpdateAvailable: (callback: (info: { version: string; releaseNotes: string }) => void) => () => void;
  onUpdateDownloadProgress: (callback: (progress: { percent: number; bytesPerSecond: number }) => void) => () => void;
  onUpdateDownloaded: (callback: (info: { version: string }) => void) => () => void;
  visionModelStatus: () => Promise<boolean>;
  visionModelStart: () => Promise<{ ok: boolean; message: string }>;
  browMonitorStart: () => Promise<{ ok: boolean; message: string }>;
  browMonitorStop: () => Promise<{ ok: boolean; message: string }>;
  browMonitorStatus: () => Promise<{ running: boolean }>;
  petShow: () => Promise<{ ok: boolean }>;
  petHide: () => Promise<{ ok: boolean }>;
  setTitleBarOverlay: (options: { color?: string; symbolColor?: string; height?: number }) => Promise<boolean>;
}

interface Window {
  electronAPI?: ElectronAPI;
}
