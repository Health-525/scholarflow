const { contextBridge, ipcRenderer } = require("electron");

/**
 * 安全的 Electron IPC 桥接
 * Token 加密存储 · 原生通知 · 系统主题 · 活动窗口追踪
 */
contextBridge.exposeInMainWorld("electronAPI", {
  isElectron: true,

  // ── Internal API Token (用于同源请求的 403 防护) ──
  getInternalToken: () => ipcRenderer.invoke("internal-token:get"),

  // ── Token 安全存储 ──
  encryptAndStoreToken: (token) =>
    ipcRenderer.invoke("token:encrypt-store", token),
  retrieveToken: () => ipcRenderer.invoke("token:retrieve"),
  clearToken: () => ipcRenderer.invoke("token:clear"),

  // ── 凭证(教务密码)安全存储 — local-first-sync 记住密码 ──
  /** 加密存储教务密码(safeStorage) */
  storeCredential: (plaintext) => ipcRenderer.invoke("credential:store", plaintext),
  /** 读取并解密教务密码,失败/不存在返回 null */
  retrieveCredential: () => ipcRenderer.invoke("credential:retrieve"),
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

  // ── Activity data 安全存储 — 替代 localStorage 明文 sf_activity_v3 ──
  /** 加密存储 activity data(safeStorage) */
  storeActivityData: (plaintext) => ipcRenderer.invoke("activity-data:store", plaintext),
  /** 读取并解密 activity data,失败/不存在返回 null */
  retrieveActivityData: () => ipcRenderer.invoke("activity-data:retrieve"),
  /** 清除已存储的 activity data */
  clearActivityData: () => ipcRenderer.invoke("activity-data:clear"),

  // ── 活动窗口追踪 ──
  /** 获取当前活动窗口信息 */
  getActiveWindow: () => ipcRenderer.invoke("activity:get-current-window"),

  /** 监听活动窗口变化 (回调参数: { title, app, timestamp }) */
  onActiveWindowChanged: (callback) => {
    const handler = (_event, info) => callback(info);
    ipcRenderer.on("active-window-changed", handler);
    return () => ipcRenderer.removeListener("active-window-changed", handler);
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
