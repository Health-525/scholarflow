const { contextBridge, ipcRenderer } = require("electron");

/**
 * 安全的 Electron IPC 桥接
 * 用于：Token 加密存储、原生通知、系统主题检测
 */
contextBridge.exposeInMainWorld("electronAPI", {
  // ── Token 安全存储 ──
  /** 加密 Token 并持久化到系统密钥链 */
  encryptAndStoreToken: (token) =>
    ipcRenderer.invoke("token:encrypt-store", token),

  /** 从系统密钥链解密并返回 Token */
  retrieveToken: () => ipcRenderer.invoke("token:retrieve"),

  /** 清除已存储的 Token */
  clearToken: () => ipcRenderer.invoke("token:clear"),

  // ── 运行环境检测 ──
  isElectron: true,
});
