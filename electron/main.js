const { app, BrowserWindow, shell, dialog, ipcMain, safeStorage } = require('electron');

const { fork } = require('child_process');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { createAutoRefreshScheduler } = require('./auto-refresh');

const INTERNAL_TOKEN_HEADER = 'x-scholarflow-internal-token';

// ── 进程级日志（早于控制台，用于排查双击无反应/闪退）─────────────
const logDir = path.join(app.getPath('userData'), 'logs');
const logPath = path.join(logDir, 'main.log');
try { fs.mkdirSync(logDir, { recursive: true }); } catch {}
function logToFile(level, msg) {
  try {
    fs.appendFileSync(logPath, `${new Date().toISOString()} [${level}] ${msg}\n`);
  } catch {}
}
logToFile('info', 'Main process starting');

process.on('uncaughtException', (err) => {
  logToFile('fatal', `uncaughtException: ${err.stack || err.message}`);
});
process.on('unhandledRejection', (reason) => {
  logToFile('error', `unhandledRejection: ${reason}`);
});


const PORT = process.env.ELECTRON_DEV ? 3000 : 3456;
const APP_URL = `http://localhost:${PORT}`;
const IS_DEV = !!process.env.ELECTRON_DEV;

let mainWindow = null;
let serverProcess = null;
let autoRefreshScheduler = null;

// ── 获取 app 根目录 ──────────────────────────────────────────
function getAppRoot() {
  // 打包后 __dirname = resources/app.asar/electron
  // standalone server.js 在 resources/app.asar.unpacked/.next/standalone/
  const inAsar = __dirname.includes('app.asar');
  if (inAsar) {
    return path.join(
      __dirname.replace(/app\.asar.*/, 'app.asar.unpacked')
    );
  }
  return path.join(__dirname, '..');
}

// ── 探测端口 ────────────────────────────────────────────────
function waitForPort(port, timeoutMs = 60000) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;
    function attempt() {
      const sock = new net.Socket();
      sock.setTimeout(800);
      sock.once('connect', () => { sock.destroy(); resolve(); });
      sock.once('error', () => {
        sock.destroy();
        Date.now() >= deadline
          ? reject(new Error(`Port ${port} timeout`))
          : setTimeout(attempt, 500);
      });
      sock.once('timeout', () => {
        sock.destroy();
        Date.now() >= deadline
          ? reject(new Error(`Port ${port} timeout`))
          : setTimeout(attempt, 500);
      });
      sock.connect(port, '127.0.0.1');
    }
    attempt();
  });
}

// ── 计算稳定数据目录(打包产物之外)──────────────────────────
/**
 * 计算稳定数据目录,位于打包产物之外,使重装/更新不丢数据。
 * 纯函数:仅依赖入参,便于单元/属性测试(见 task 8.2)。
 * @param {{ PORTABLE_EXECUTABLE_DIR?: string }} env  process.env 子集
 * @param {{ getPath: (name: string) => string }} app electron app
 * @returns {string} 绝对路径
 */
function resolveStableDataDir(env, app) {
  // 便携版:exe 同级 ScholarFlowData (R2.3)
  if (env.PORTABLE_EXECUTABLE_DIR) {
    return path.join(env.PORTABLE_EXECUTABLE_DIR, 'ScholarFlowData');
  }
  // 安装版:userData/data,位于 %APPDATA%,不被卸载/更新覆盖 (R2.4)
  return path.join(app.getPath('userData'), 'data');
}

// ── 内部调用 token ──────────────────────────────────────────
/**
 * 生成或复用稳定的内部调用 token。
 * token 持久化在稳定数据目录,供主进程与 standalone server 共享。
 */
function getOrCreateInternalToken(dataDir) {
  const tokenPath = path.join(dataDir, '.internal-token');
  try {
    if (fs.existsSync(tokenPath)) {
      const existing = fs.readFileSync(tokenPath, 'utf-8').trim();
      if (existing) return existing;
    }
  } catch {}

  const token = crypto.randomBytes(32).toString('hex');
  try {
    fs.writeFileSync(tokenPath, token, { mode: 0o600 });
  } catch {
    fs.writeFileSync(tokenPath, token);
  }
  return token;
}

// ── 启动 standalone server ──────────────────────────────────
function launchServer() {
  return new Promise((resolve, reject) => {
    const appRoot = getAppRoot();

    // Next.js standalone 模式生成的独立服务器脚本
    // Next.js 15 monorepo 检测可能把 server.js 放在子目录里
    const candidates = [
      path.join(appRoot, '.next', 'standalone', 'scholarflow', 'server.js'),
      path.join(appRoot, '.next', 'standalone', 'server.js'),
    ];
    const serverScript = candidates.find(fs.existsSync) || candidates[0];

    console.log('[SF] App root:', appRoot);
    console.log('[SF] Server script:', serverScript);

    if (!fs.existsSync(serverScript)) {
      return reject(new Error(
        `找不到 server.js:\n${serverScript}\n\n请确保用 "npm run electron:build" 重新打包。`
      ));
    }

    // 数据目录:便携版放在 exe 同级 ScholarFlowData 文件夹;安装版放在 userData/data
    // (提取为 resolveStableDataDir 纯函数,见上方;R2.3/R2.4)
    const dataDir = resolveStableDataDir(process.env, app);
    fs.mkdirSync(dataDir, { recursive: true });
    logToFile('info', `[SF] Data directory (stable): ${dataDir}`);
    console.log('[SF] Data directory:', dataDir);

    const internalToken = getOrCreateInternalToken(dataDir);
    globalThis.__scholarflowInternalToken = internalToken;

    // fork 比 spawn 更可靠，直接用 Node 运行，不需要 shell
    const cwd = path.dirname(serverScript);
    serverProcess = fork(serverScript, [], {
      cwd,
      env: {
        ...process.env,
        NODE_ENV: 'production',
        PORT: String(PORT),
        HOSTNAME: '127.0.0.1',
        SCHOLARFLOW_DATA_DIR: dataDir,
        ELECTRON_USER_DATA: dataDir,
        SCHOLARFLOW_INTERNAL_TOKEN: internalToken,
        // 子进程以纯 Node 模式运行 Electron 二进制(Electron ABI),
        // 以便 better-sqlite3 原生模块按 Electron ABI 加载 (见 design §1.1)
        ELECTRON_RUN_AS_NODE: '1',
        // standalone 需要知道 public 和 .next/static 的位置
        // 通过 symlink 或者环境变量传递
      },
      stdio: 'pipe',
    });

    serverProcess.stdout && serverProcess.stdout.on('data', d => {
      console.log('[Server]', d.toString().trim());
    });

    serverProcess.stderr && serverProcess.stderr.on('data', d => {
      console.error('[Server ERR]', d.toString().trim());
    });

    serverProcess.on('error', reject);
    serverProcess.on('exit', code => {
      if (code && code !== 0) console.warn('[SF] Server exited with code', code);
    });

    setTimeout(resolve, 500);
  });
}

// ── 创建窗口 ────────────────────────────────────────────────

// ── IPC: 动态更新 titleBarOverlay 颜色（跟随主题）
ipcMain.handle('window:set-titlebar-overlay', async (_event, options) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setTitleBarOverlay(options);
    return true;
  }
  return false;
});

// ── Token 存储路径 ──────────────────────────────────────────
function getTokenStorePath() {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'secure-token.enc');
}

// ── IPC: Token 加密存储与检索 ─────────────────────────────
function setupSecureTokenIPC() {
  ipcMain.handle('token:encrypt-store', async (_event, token) => {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('系统加密不可用');
    }
    const encrypted = safeStorage.encryptString(token);
    const buf = Buffer.from(encrypted).toString('base64');
    fs.writeFileSync(getTokenStorePath(), buf, 'utf-8');
    return true;
  });

  ipcMain.handle('token:retrieve', async () => {
    const encPath = getTokenStorePath();
    if (!fs.existsSync(encPath)) return null;
    if (!safeStorage.isEncryptionAvailable()) return null;
    try {
      const buf = fs.readFileSync(encPath, 'utf-8');
      const encrypted = Buffer.from(buf, 'base64');
      return safeStorage.decryptString(encrypted);
    } catch {
      return null;
    }
  });

  ipcMain.handle('token:clear', async () => {
    const encPath = getTokenStorePath();
    if (fs.existsSync(encPath)) fs.unlinkSync(encPath);
    return true;
  });

  ipcMain.handle('internal-token:get', async () => {
    return globalThis.__scholarflowInternalToken || null;
  });
}

// ── 凭证存储路径(与图书馆 token 隔离)────────────────────────
function getCredentialStorePath() {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'secure-credential.enc');
}

// ── IPC: 凭证(密码)加密存储与检索 ─────────────────────────
// 独立于 token:* IPC,使用单独的 secure-credential.enc 文件,
// 避免与图书馆 token 的 secure-token.enc 互相覆盖 (design §5, R3.3/3.4/3.6/4.2/9.5)
function setupSecureCredentialIPC() {
  ipcMain.handle('credential:store', async (_event, plaintext) => {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('系统加密不可用');
    }
    const encrypted = safeStorage.encryptString(plaintext);
    const buf = Buffer.from(encrypted).toString('base64');
    fs.writeFileSync(getCredentialStorePath(), buf, 'utf-8');
    return true;
  });

  ipcMain.handle('credential:retrieve', async () => {
    const encPath = getCredentialStorePath();
    if (!fs.existsSync(encPath)) return null;
    if (!safeStorage.isEncryptionAvailable()) return null;
    try {
      const buf = fs.readFileSync(encPath, 'utf-8');
      const encrypted = Buffer.from(buf, 'base64');
      return safeStorage.decryptString(encrypted);
    } catch {
      return null;
    }
  });

  ipcMain.handle('credential:clear', async () => {
    const encPath = getCredentialStorePath();
    if (fs.existsSync(encPath)) fs.unlinkSync(encPath);
    return true;
  });

  ipcMain.handle('credential:secure-available', async () => {
    return safeStorage.isEncryptionAvailable();
  });
}

// ── Auth state 安全存储路径(与用户凭证隔离)──────────────────
function getAuthStateStorePath() {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'secure-auth-state.enc');
}

// ── IPC: Auth state 加密存储与检索 ──────────────────────────
function setupAuthStateIPC() {
  ipcMain.handle('auth-state:store', async (_event, plaintext) => {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('系统加密不可用');
    }
    const encrypted = safeStorage.encryptString(plaintext);
    const buf = Buffer.from(encrypted).toString('base64');
    fs.writeFileSync(getAuthStateStorePath(), buf, 'utf-8');
    return true;
  });

  ipcMain.handle('auth-state:retrieve', async () => {
    const encPath = getAuthStateStorePath();
    if (!fs.existsSync(encPath)) return null;
    if (!safeStorage.isEncryptionAvailable()) return null;
    try {
      const buf = fs.readFileSync(encPath, 'utf-8');
      const encrypted = Buffer.from(buf, 'base64');
      return safeStorage.decryptString(encrypted);
    } catch {
      return null;
    }
  });

  ipcMain.handle('auth-state:clear', async () => {
    const encPath = getAuthStateStorePath();
    if (fs.existsSync(encPath)) fs.unlinkSync(encPath);
    return true;
  });
}

// ── Activity data 安全存储路径(与 auth state 隔离)────────────
function getActivityDataStorePath() {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'secure-activity-data.enc');
}

// ── IPC: Activity data 加密存储与检索 ───────────────────────
function setupActivityDataIPC() {
  ipcMain.handle('activity-data:store', async (_event, plaintext) => {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('系统加密不可用');
    }
    const encrypted = safeStorage.encryptString(plaintext);
    const buf = Buffer.from(encrypted).toString('base64');
    fs.writeFileSync(getActivityDataStorePath(), buf, 'utf-8');
    return true;
  });

  ipcMain.handle('activity-data:retrieve', async () => {
    const encPath = getActivityDataStorePath();
    if (!fs.existsSync(encPath)) return null;
    if (!safeStorage.isEncryptionAvailable()) return null;
    try {
      const buf = fs.readFileSync(encPath, 'utf-8');
      const encrypted = Buffer.from(buf, 'base64');
      return safeStorage.decryptString(encrypted);
    } catch {
      return null;
    }
  });

  ipcMain.handle('activity-data:clear', async () => {
    const encPath = getActivityDataStorePath();
    if (fs.existsSync(encPath)) fs.unlinkSync(encPath);
    return true;
  });
}

// ── 取记住的(已解密)密码,供 AutoRefreshScheduler 静默重登使用 ──────
// 复用 getCredentialStorePath() 读取 secure-credential.enc,逻辑等价于
// credential:retrieve handler:文件不存在 / 加密不可用 / 解密失败均返回 null。
function retrieveCredentialPassword() {
  try {
    const encPath = getCredentialStorePath();
    if (!fs.existsSync(encPath)) return null;
    if (!safeStorage.isEncryptionAvailable()) return null;
    const buf = fs.readFileSync(encPath, 'utf-8');
    const encrypted = Buffer.from(buf, 'base64');
    return safeStorage.decryptString(encrypted);
  } catch {
    return null;
  }
}

const { activeWindow } = require('active-win');
const { autoUpdater } = require('electron-updater');

// ── 活动窗口追踪 ──────────────────────────────────────────
let activeWindowTimer = null;
let lastActiveWindow = null;

function startActiveWindowTracking() {
  if (activeWindowTimer) return;
  const POLL_INTERVAL = 3000;

  activeWindowTimer = setInterval(async () => {
    try {
      // 窗口最小化或不可见时跳过轮询，节省 CPU 和电量
      if (!mainWindow || mainWindow.isDestroyed() || mainWindow.isMinimized() || !mainWindow.isVisible()) return;

      const win = await activeWindow();
      if (!win) return;

      const info = {
        title: win.title,
        app: win.owner?.name || 'Unknown',
        timestamp: Date.now(),
      };

      if (!lastActiveWindow || lastActiveWindow.app !== info.app || lastActiveWindow.title !== info.title) {
        lastActiveWindow = info;
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('active-window-changed', info);
        }
      }
    } catch (err) {
      console.error('[SF] activeWindow error:', err.message);
    }
  }, POLL_INTERVAL);
}

function stopActiveWindowTracking() {
  if (activeWindowTimer) {
    clearInterval(activeWindowTimer);
    activeWindowTimer = null;
    lastActiveWindow = null;
  }
}

ipcMain.handle('activity:get-current-window', async () => {
  try {
    const win = await activeWindow();
    if (!win) return null;
    return {
      title: win.title,
      app: win.owner?.name || 'Unknown',
      timestamp: Date.now(),
    };
  } catch {
    return null;
  }
});

function createWindow() {
  const appRoot = getAppRoot();
  const iconPath = path.join(appRoot, 'public', 'icons', 'logo.png');
  const preloadPath = path.join(__dirname, 'preload.js');

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 900,
    minHeight: 600,
    title: 'ScholarFlow',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    frame: false,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#faf7f2',
      symbolColor: '#1a1510',
      height: 36,
    },
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: preloadPath,
    },
    autoHideMenuBar: true,
    backgroundColor: '#faf7f2',
    show: false,
  });

  mainWindow.loadURL(APP_URL);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
    startActiveWindowTracking();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const { protocol, hostname } = new URL(url);
      // 只允许 http/https 协议，禁止 javascript: / file: / data: 等危险 scheme
      if (protocol !== 'http:' && protocol !== 'https:') {
        logToFile('warn', `[WindowOpen] blocked dangerous scheme: ${url}`);
        return { action: 'deny' };
      }
      // 内部页面放行
      if (url.startsWith(`http://localhost:${PORT}`)) {
        return { action: 'allow' };
      }
      // 外部链接：仅打开已知安全域或用户确认后的链接
      const allowedExternalHosts = process.env.ALLOWED_EXTERNAL_HOSTS
        ? process.env.ALLOWED_EXTERNAL_HOSTS.split(',').map(h => h.trim()).filter(Boolean)
        : [];
      if (allowedExternalHosts.length > 0 && !allowedExternalHosts.includes(hostname)) {
        logToFile('warn', `[WindowOpen] blocked external host: ${hostname}`);
        return { action: 'deny' };
      }
      shell.openExternal(url);
    } catch {
      logToFile('warn', `[WindowOpen] blocked invalid url: ${url}`);
    }
    return { action: 'deny' };
  });

  mainWindow.webContents.on('did-fail-load', (_, code, desc) => {
    console.error('[SF] Load failed:', code, desc);
    setTimeout(() => { if (mainWindow) mainWindow.loadURL(APP_URL); }, 2500);
  });

  mainWindow.on('closed', () => { mainWindow = null; stopActiveWindowTracking(); });
}

// ── 自动更新 ────────────────────────────────────────────────
function setupAutoUpdater() {
  // 开发模式不检查更新
  if (IS_DEV) return;

  autoUpdater.autoDownload = false;  // 不自动下载，先提示用户
  autoUpdater.autoRunAppAfterInstall = true;

  autoUpdater.on('update-available', (info) => {
    console.log('[SF] Update available:', info.version);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-available', {
        version: info.version,
        releaseNotes: info.releaseNotes || '',
      });
    }
  });

  autoUpdater.on('update-not-available', () => {
    console.log('[SF] App is up-to-date');
  });

  autoUpdater.on('download-progress', (progress) => {
    console.log('[SF] Download:', Math.round(progress.percent) + '%');
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-download-progress', {
        percent: Math.round(progress.percent),
        bytesPerSecond: progress.bytesPerSecond,
      });
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log('[SF] Update downloaded:', info.version);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-downloaded', { version: info.version });
    }
  });

  autoUpdater.on('error', (err) => {
    console.error('[SF] Update error:', err.message);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-error', { message: err.message });
    }
  });

  // IPC: 手动检查更新
  ipcMain.handle('update:check', async () => {
    try {
      const result = await autoUpdater.checkForUpdates();
      return { currentVersion: app.getVersion(), latestVersion: result?.updateInfo?.version || null };
    } catch (err) {
      return { error: err.message };
    }
  });

  // IPC: 下载更新
  ipcMain.handle('update:download', async () => {
    try {
      await autoUpdater.downloadUpdate();
      return true;
    } catch (err) {
      return { error: err.message };
    }
  });

  // IPC: 安装更新（退出并安装）
  ipcMain.handle('update:install', () => {
    autoUpdater.quitAndInstall(false, true);
  });

  // 启动后延迟 5 秒检查更新（避免启动时卡顿）
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => {});
  }, 5000);
}

// ── 主流程 ──────────────────────────────────────────────────
app.whenReady().then(async () => {
  setupSecureTokenIPC();
  setupSecureCredentialIPC();
  setupAuthStateIPC();
  setupActivityDataIPC();
  setupAutoUpdater();
  try {
    console.log('[SF] Starting...');
    if (!IS_DEV) {
      await launchServer();
      console.log('[SF] Waiting for port', PORT);
      await waitForPort(PORT, 60000);
    } else {
      console.log('[SF] Dev mode — connecting to next dev on port', PORT);
      await waitForPort(PORT, 30000);
    }
    console.log('[SF] Ready, opening window');
    createWindow();
    startActiveWindowTracking();

    // 本地优先:不再「启动即爬取」。改由 AutoRefreshScheduler 按抖动周期
    // 静默调度刷新(关窗后仍可触发),退出时清理定时器 (task 11.2, R5.1/R5.5)。
    autoRefreshScheduler = createAutoRefreshScheduler({
      port: PORT,
      internalToken: globalThis.__scholarflowInternalToken,
      getMainWindow: () => mainWindow,
      retrievePassword: retrieveCredentialPassword,
      log: (level, msg) => logToFile(level, `[AutoRefresh] ${msg}`),
    });
    autoRefreshScheduler.start();
  } catch (err) {
    const errMsg = err instanceof Error ? err.stack || err.message : String(err);
    logToFile('fatal', `startup failed: ${errMsg}`);
    console.error('[SF] Fatal:', err);
    dialog.showErrorBox('ScholarFlow 启动失败', `${err.message}`);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (autoRefreshScheduler) { autoRefreshScheduler.stop(); }
  if (serverProcess) { serverProcess.kill(); serverProcess = null; }
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (!mainWindow) createWindow();
});

app.on('before-quit', () => {
  stopActiveWindowTracking();
  if (autoRefreshScheduler) { autoRefreshScheduler.stop(); }
  if (serverProcess) { serverProcess.kill('SIGTERM'); serverProcess = null; }
});

// 导出纯函数供测试引用(task 8.2);在 Electron 中作为入口正常运行,
// module.exports 不影响主进程逻辑(CommonJS)。
module.exports = { resolveStableDataDir };
