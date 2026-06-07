const { contextBridge, ipcRenderer } = require("electron");

/**
 * 安全的 Electron IPC 桥接
 * Token 加密存储 · 原生通知 · 系统主题 · 活动窗口追踪
 */
contextBridge.exposeInMainWorld("electronAPI", {
  isElectron: true,

  // ── Token 安全存储 ──
  encryptAndStoreToken: (token) =>
    ipcRenderer.invoke("token:encrypt-store", token),
  retrieveToken: () => ipcRenderer.invoke("token:retrieve"),
  clearToken: () => ipcRenderer.invoke("token:clear"),

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
});
