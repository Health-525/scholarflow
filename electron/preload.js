const { contextBridge, ipcRenderer } = require("electron");

/**
 * 安全的 Electron IPC 桥接
 * Token 加密存储 · 原生通知 · 系统主题 · 活动窗口追踪
 */
contextBridge.exposeInMainWorld("electronAPI", {
  isElectron: true,

  // ── Token 安全存储 ──
  // 注意：内部 API token 不再暴露给 renderer，改由主进程 webRequest 拦截器
  // 自动附加到本地 /api/* 请求，避免 renderer XSS 读取 token。
  encryptAndStoreToken: (token) =>
    ipcRenderer.invoke("token:encrypt-store", token),
  retrieveToken: () => ipcRenderer.invoke("token:retrieve"),
  clearToken: () => ipcRenderer.invoke("token:clear"),

  // ── 凭证(教务密码)安全存储 — local-first-sync 记住密码 ──
  // 仅保留写入入口（登录/记住密码时使用）；读取入口保留在主进程内部，
  // 由 auto-refresh 调度器直接使用，避免 renderer XSS 读取明文密码。
  /** 加密存储教务密码(safeStorage) */
  storeCredential: (plaintext) => ipcRenderer.invoke("credential:store", plaintext),
  /** 清除已记住的教务密码 */
  clearCredential: () => ipcRenderer.invoke("credential:clear"),
  /** 查询 OS 级加密是否可用 */
  secureStorageAvailable: () => ipcRenderer.invoke("credential:secure-available"),

  // ── Auth state 安全存储 — 替代 localStorage 明文 sf_auth ──
  /** 加密存储 auth state(safeStorage) */
  storeAuthState: (plaintext) => ipcRenderer.invoke("auth-state:store", plaintext),
  /** 读取并解密 auth state,失败/不存在返回 null */
  retrieveAuthState: () => ipcRenderer.invoke("auth-state:retrieve"),
  /** 清除已存储的 auth state */
  clearAuthState: () => ipcRenderer.invoke("auth-state:clear"),

  // ── 屏幕时间追踪 ──
  /** 查询某一天的活动统计 */
  queryActivityDay: (date) => ipcRenderer.invoke("activity:query-day", date),
  /** 查询日期范围的活动统计 */
  queryActivityRange: (start, end) => ipcRenderer.invoke("activity:query-range", start, end),
  /** 清除所有屏幕时间数据 */
  clearActivityData: () => ipcRenderer.invoke("activity:clear-data"),
  /** 获取当前追踪状态 */
  getActivityState: () => ipcRenderer.invoke("activity:get-state"),

  /** 监听活动状态变化 (回调参数: { state, app, title, category, since, durationSeconds }) */
  onActivityStateChanged: (callback) => {
    const handler = (_event, info) => callback(info);
    ipcRenderer.on("activity-state-changed", handler);
    return () => ipcRenderer.removeListener("activity-state-changed", handler);
  },

  // ── 自动更新 ──
  /** 手动检查更新 */
  updateCheck: () => ipcRenderer.invoke("update:check"),
  /** 下载更新 */
  updateDownload: () => ipcRenderer.invoke("update:download"),
  /** 安装已下载的更新（退出并安装） */
  updateInstall: () => ipcRenderer.invoke("update:install"),

  /** 监听：发现新版本 */
  onUpdateAvailable: (callback) => {
    const handler = (_event, info) => callback(info);
    ipcRenderer.on("update-available", handler);
    return () => ipcRenderer.removeListener("update-available", handler);
  },
  /** 监听：下载进度 */
  onUpdateDownloadProgress: (callback) => {
    const handler = (_event, progress) => callback(progress);
    ipcRenderer.on("update-download-progress", handler);
    return () => ipcRenderer.removeListener("update-download-progress", handler);
  },
  /** 监听：更新已下载完成 */
  onUpdateDownloaded: (callback) => {
    const handler = (_event, info) => callback(info);
    ipcRenderer.on("update-downloaded", handler);
    return () => ipcRenderer.removeListener("update-downloaded", handler);
  },
  /** 监听：更新出错 */
  onUpdateError: (callback) => {
    const handler = (_event, err) => callback(err);
    ipcRenderer.on("update-error", handler);
    return () => ipcRenderer.removeListener("update-error", handler);
  },

  // ── 窗口标题栏 ──
  /** 动态更新 titleBarOverlay 颜色（跟随主题） */
  setTitleBarOverlay: (options) => ipcRenderer.invoke("window:set-titlebar-overlay", options),
});
