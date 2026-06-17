'use strict';

/**
 * pet-preload.js — 桌面宠物窗口的最小权限预加载脚本。
 *
 * 宠物窗口不需要完整 Node.js 访问权限，只需要：
 *   1. IPC 通信（发送 pet:close、接收 brow-alert）
 *   2. HTTP 轮询 wrinkle-alert（通过 http 模块，主进程注入端口）
 *   3. 本地 pet 图片路径（通过 path 模块拼接）
 *
 * 所有能力通过 contextBridge 暴露给渲染层，不暴露原始 ipcRenderer / Node API。
 */

const { contextBridge, ipcRenderer } = require('electron');
const http = require('http');
const path = require('path');

// pet 图片绝对路径（__dirname 是 electron/ 目录）
const petDir = path.join(__dirname, '..', 'public', 'pet');
const PET_PATHS = {
  normal:   path.join(petDir, 'normal.png'),
  angry:    path.join(petDir, 'angry.png'),
  sleeping: path.join(petDir, 'sleeping.png'),
};

contextBridge.exposeInMainWorld('petAPI', {
  /** 图片绝对路径 */
  paths: PET_PATHS,

  /** 右键关闭宠物窗口 */
  close: () => ipcRenderer.send('pet:close'),

  /** 订阅来自主进程的抬眉警报（主进程推送 brow-alert 事件） */
  onBrowAlert: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('brow-alert', handler);
    // 返回清理函数（可选调用）
    return () => ipcRenderer.removeListener('brow-alert', handler);
  },

  /**
   * 轮询 wrinkle-alert 接口。
   * @param {number} port  服务器端口（由主进程注入，默认 3456）
   * @param {(result: {rising: boolean, score: number} | null) => void} onResult
   * @param {number} [timeoutMs=2000]  单次请求超时
   * @returns {Promise<{rising: boolean, score: number} | null>}
   */
  pollWrinkleAlert: (port, timeoutMs = 2000) => {
    return new Promise((resolve) => {
      try {
        const req = http.get(`http://127.0.0.1:${port}/api/wrinkle-alert`, (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => {
            try { resolve(JSON.parse(data)); }
            catch { resolve(null); }
          });
        });
        req.on('error', () => resolve(null));
        req.setTimeout(timeoutMs, () => { req.destroy(); resolve(null); });
      } catch {
        resolve(null);
      }
    });
  },
});
