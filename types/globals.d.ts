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

interface ActivityDaySummary {
  totalMinutes: number;
  idleMinutes: number;
  awayMinutes: number;
  categoryBreakdown: Array<{ category: string; minutes: number }>;
  appBreakdown: Array<{ app: string; minutes: number; category?: string | null }>;
  segments: Array<{
    id?: number;
    type: 'app' | 'idle' | 'away';
    app?: string | null;
    title?: string | null;
    domain?: string | null;
    category?: string | null;
    project?: string | null;
    beginAt: number;
    endAt?: number | null;
  }>;
}

interface ActivityStateInfo {
  state: 'active' | 'idle' | 'away' | 'paused';
  app?: string;
  title?: string;
  category?: string;
  since: number;
  durationSeconds: number;
}

interface ActivitySettings {
  paused: boolean;
  excludedApps: string[];
  recordTitles: boolean;
  idleThresholdMinutes: number;
  appOverrides: Array<{ pattern: string; app?: string; category: string }>;
}

/** electron/main.js 的 library:refresh-jwt / library:login 返回值 */
interface LibraryJWTResult {
  ok: boolean;
  message: string;
}

/** electron/main.js 通过 library:jwt-refreshed 推送的载荷 */
interface LibraryJWTRefreshedPayload {
  ok: boolean;
  /** JWT 过期时间，ISO 8601 */
  expiry: string;
}

interface ElectronAPI {
  isElectron: boolean;
  // 注意：内部 API token 不再暴露给 renderer，改由主进程 webRequest 拦截器自动附加。
  encryptAndStoreToken: (token: string) => Promise<boolean>;
  retrieveToken: () => Promise<string | null>;
  clearToken: () => Promise<boolean>;
  updateCheck: () => Promise<{ currentVersion: string; latestVersion: string | null; error?: string }>;
  updateDownload: () => Promise<boolean | { error: string }>;
  updateInstall: () => Promise<void>;
  onUpdateAvailable: (callback: (info: UpdateInfo) => void) => () => void;
  onUpdateDownloadProgress: (callback: (progress: DownloadProgress) => void) => () => void;
  onUpdateDownloaded: (callback: (info: { version: string }) => void) => () => void;
  onUpdateError: (callback: (err: { message: string }) => void) => () => void;
  // 图书馆 JWT：与 electron/preload.js 的 library 契约一一对应。
  // preload 是无类型的 JS，改动不会被编译器拦住——新增/变更 IPC 通道时必须同步这里。
  /** 检查现有 JWT，失效则弹登录窗口 */
  libraryRefreshJWT: () => Promise<LibraryJWTResult>;
  /** 直接打开图书馆登录窗口 */
  libraryLogin: () => Promise<LibraryJWTResult>;
  /** JWT 已过期需重新登录；返回取消订阅函数 */
  onLibraryJWTExpired: (callback: () => void) => () => void;
  /** JWT 刷新成功；返回取消订阅函数 */
  onLibraryJWTRefreshed: (callback: (data: LibraryJWTRefreshedPayload) => void) => () => void;
  setTitleBarOverlay: (options: { color?: string; symbolColor?: string; height?: number }) => Promise<boolean>;
  // Local-first-sync credential APIs：仅暴露写入/清除给 renderer；读取保留在主进程内部。
  storeCredential?: (plaintext: string) => Promise<boolean>;
  clearCredential?: () => Promise<boolean>;
  secureStorageAvailable?: () => Promise<boolean>;
  // Auth state secure storage (replaces plaintext localStorage sf_auth)
  storeAuthState?: (plaintext: string) => Promise<boolean>;
  retrieveAuthState?: () => Promise<string | null>;
  clearAuthState?: () => Promise<boolean>;
  // Screen-time tracking APIs (Electron main process, replaces encrypted file storage)
  queryActivityDay: (date: string) => Promise<ActivityDaySummary>;
  queryActivityRange: (start: string, end: string) => Promise<Array<{ date: string; totalMinutes: number; idleMinutes: number; awayMinutes: number }>>;
  clearActivityData: () => Promise<void>;
  getActivityState: () => Promise<ActivityStateInfo>;
  getActivitySettings: () => Promise<ActivitySettings>;
  updateActivitySettings: (settings: Partial<ActivitySettings>) => Promise<ActivitySettings>;
  toggleActivityPaused: () => Promise<ActivitySettings>;
  recategorizeActivityData: () => Promise<number>;
  onActivityStateChanged: (callback: (info: ActivityStateInfo) => void) => () => void;
}

interface Window {
  electronAPI?: ElectronAPI;
}
