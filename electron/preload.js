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
});
