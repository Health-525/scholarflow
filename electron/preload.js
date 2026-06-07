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

  // ── Vision-Model API ──
  /** 检查 Vision-Model API 是否运行 */
  visionModelStatus: () => ipcRenderer.invoke("vision-model:status"),
  /** 启动 Vision-Model API */
  visionModelStart: () => ipcRenderer.invoke("vision-model:start"),

  // ── 抬头纹后台监控 ──
  /** 启动后台抬眉监控 */
  browMonitorStart: () => ipcRenderer.invoke("brow-monitor:start"),
  /** 停止后台抬眉监控 */
  browMonitorStop: () => ipcRenderer.invoke("brow-monitor:stop"),
  /** 查询监控状态 */
  browMonitorStatus: () => ipcRenderer.invoke("brow-monitor:status"),

  // ── 桌面宠物 ──
  /** 显示桌面宠物 */
  petShow: () => ipcRenderer.invoke("pet:show"),
  /** 隐藏桌面宠物 */
  petHide: () => ipcRenderer.invoke("pet:hide"),

  // ── 抬头纹后台监控 ──
  /** 启动后台抬头纹监控 */
  browMonitorStart: () => ipcRenderer.invoke("brow-monitor:start"),
  /** 停止后台抬头纹监控 */
  browMonitorStop: () => ipcRenderer.invoke("brow-monitor:stop"),
  /** 查询监控状态 */
  browMonitorStatus: () => ipcRenderer.invoke("brow-monitor:status"),

  // ── 图书馆 JWT ──
  /** 刷新JWT（先检查是否有效，过期则弹登录窗口） */
  libraryRefreshJWT: () => ipcRenderer.invoke("library:refresh-jwt"),
  /** 打开图书馆登录窗口 */
  libraryLogin: () => ipcRenderer.invoke("library:login"),
  /** 监听：JWT已过期，需要重新登录 */
  onLibraryJWTExpired: (callback) => {
    const handler = () => callback();
    ipcRenderer.on("library:jwt-expired", handler);
    return () => ipcRenderer.removeListener("library:jwt-expired", handler);
  },
  /** 监听：JWT刷新成功 */
  onLibraryJWTRefreshed: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on("library:jwt-refreshed", handler);
    return () => ipcRenderer.removeListener("library:jwt-refreshed", handler);
  },
});
