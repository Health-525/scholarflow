const { app, BrowserWindow, shell, dialog, ipcMain, safeStorage, powerMonitor, session } = require('electron');

const path = require('path');
const fs = require('fs');

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

// 生产环境不再向 stdout/stderr 输出 info/warn，避免泄露与噪声；文件日志仍保留。
const isDevMain = !app.isPackaged;
if (!isDevMain) {
  console.log = () => {};
  console.warn = () => {};
}

const { fork } = require('child_process');
const net = require('net');
const crypto = require('crypto');
const { createAutoRefreshScheduler } = require('./auto-refresh');
const { createActivityTracker } = require('./activity-tracker');

const INTERNAL_TOKEN_HEADER = 'x-scholarflow-internal-token';

process.on('uncaughtException', (err) => {
  logToFile('fatal', `uncaughtException: ${err.stack || err.message}`);
});
process.on('unhandledRejection', (reason) => {
  logToFile('error', `unhandledRejection: ${reason}`);
});


const PORT = process.env.PORT ? Number(process.env.PORT) : (process.env.ELECTRON_DEV ? 3000 : 3456);
const APP_URL = `http://localhost:${PORT}`;
const IS_DEV = !!process.env.ELECTRON_DEV;

let mainWindow = null;
let serverProcess = null;
let autoRefreshScheduler = null;
let activityTracker = null;

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
  // 热重载开发态:server 与主进程都使用项目根目录 data/,确保 token 与数据库共享
  if (env.ELECTRON_DEV) {
    return path.join(process.cwd(), 'data');
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

// ── 为 renderer 发起的本地 API 请求自动附加内部 token ────────
// renderer 不再通过 preload 暴露 getInternalToken，避免 XSS 读取 token。
// 主进程在请求离开 renderer 前自动附加 header，既保证 isTrustedOrigin 通过，
// 又把 token 控制在主进程/网络层。
function setupInternalTokenRequestInterceptor() {
  const token = globalThis.__scholarflowInternalToken || process.env.SCHOLARFLOW_INTERNAL_TOKEN;
  if (!token) {
    logToFile('error', 'internal token not available, cannot setup request interceptor');
    return;
  }

  const filter = {
    urls: [
      `http://localhost:${PORT}/api/*`,
      `http://127.0.0.1:${PORT}/api/*`,
    ],
  };

  session.defaultSession.webRequest.onBeforeSendHeaders(filter, (details, callback) => {
    const headers = details.requestHeaders || {};
    const existing = Object.keys(headers).find(k => k.toLowerCase() === INTERNAL_TOKEN_HEADER.toLowerCase());
    if (!existing) {
      headers[INTERNAL_TOKEN_HEADER] = token;
    }
    callback({ requestHeaders: headers });
  });
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

// ── 启动 Next.js dev server（开发模式）──────────────────────
function launchDevServer() {
  return new Promise((resolve, reject) => {
    const dataDir = path.resolve(process.cwd(), 'data');
    fs.mkdirSync(dataDir, { recursive: true });
    logToFile('info', `[SF] Dev data directory: ${dataDir}`);
    console.log('[SF] Dev data directory:', dataDir);

    const internalToken = getOrCreateInternalToken(dataDir);
    globalThis.__scholarflowInternalToken = internalToken;

    let serverScript;
    try {
      serverScript = require.resolve('next/dist/bin/next');
    } catch (err) {
      return reject(new Error(`找不到 next dev 入口: ${err.message}`));
    }

    console.log('[SF] Dev server script:', serverScript);

    serverProcess = fork(serverScript, ['dev'], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        NODE_ENV: 'development',
        PORT: String(PORT),
        HOSTNAME: '127.0.0.1',
        SCHOLARFLOW_DATA_DIR: dataDir,
        ELECTRON_USER_DATA: dataDir,
        SCHOLARFLOW_INTERNAL_TOKEN: internalToken,
        // 子进程以纯 Node 模式运行 Electron 二进制(Electron ABI),
        // 与主进程 ABI 一致，从而 activity-tracker 可直接使用 SQLite
        ELECTRON_RUN_AS_NODE: '1',
      },
      stdio: 'pipe',
    });

    serverProcess.stdout && serverProcess.stdout.on('data', d => {
      console.log('[DevServer]', d.toString().trim());
    });

    serverProcess.stderr && serverProcess.stderr.on('data', d => {
      console.error('[DevServer ERR]', d.toString().trim());
    });

    serverProcess.on('error', reject);
    serverProcess.on('exit', code => {
      if (code && code !== 0) console.warn('[SF] Dev server exited with code', code);
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

}

// ── 凭证存储路径(与图书馆 token 隔离)────────────────────────
function getCredentialStorePath() {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'secure-credential.enc');
}

// ── IPC: 凭证(密码)加密存储 ─────────────────────────────────
// 仅暴露写入/清除入口给 renderer；读取入口保留在主进程内部
// (retrieveCredentialPassword)，供 auto-refresh 调度器使用，避免 renderer XSS
// 读取明文密码。
// 使用单独的 secure-credential.enc 文件，避免与图书馆 token 的 secure-token.enc
// 互相覆盖 (design §5, R3.3/3.4/3.6/4.2/9.5)
function setupSecureCredentialIPC() {
  ipcMain.handle('credential:store', async (event, plaintext) => {
    // 仅允许 /setup 页面调用存储密码，防止任意 renderer 页面通过 XSS 保存/覆盖密码。
    const senderUrl = event.senderFrame?.url || event.sender?.getURL?.() || '';
    try {
      const { pathname } = new URL(senderUrl);
      if (!pathname.startsWith('/setup')) {
        logToFile('warn', `[credential:store] rejected from ${senderUrl}`);
        throw new Error('禁止的调用来源');
      }
    } catch {
      throw new Error('无法验证调用来源');
    }

    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('系统加密不可用');
    }
    const encrypted = safeStorage.encryptString(plaintext);
    const buf = Buffer.from(encrypted).toString('base64');
    fs.writeFileSync(getCredentialStorePath(), buf, 'utf-8');
    return true;
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

const { autoUpdater } = require('electron-updater');

// ── 屏幕时间追踪 ──────────────────────────────────────────
function sendToRenderer(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload);
  }
}

function setupActivityTrackerIPC() {
  ipcMain.handle('activity:query-day', async (_event, date) => activityTracker.queryDay(date));
  ipcMain.handle('activity:query-range', async (_event, start, end) => activityTracker.queryRange(start, end));
  ipcMain.handle('activity:clear-data', async () => activityTracker.clearData());
  ipcMain.handle('activity:get-state', async () => activityTracker.getCurrentState());
  ipcMain.handle('activity:get-settings', async () => activityTracker.getSettings());
  ipcMain.handle('activity:update-settings', async (_event, settings) => activityTracker.updateSettings(settings));
  ipcMain.handle('activity:toggle-paused', async () => activityTracker.togglePaused());
  ipcMain.handle('activity:recategorize', async () => activityTracker.recategorizeHistoricalData());
}

function migrateLegacyActivityData() {
  if (!activityTracker) return;
  const legacyPath = path.join(app.getPath('userData'), 'secure-activity-data.enc');
  if (!fs.existsSync(legacyPath)) return;
  try {
    if (!safeStorage.isEncryptionAvailable()) return;
    const buf = fs.readFileSync(legacyPath, 'utf-8');
    const encrypted = Buffer.from(buf, 'base64');
    const raw = safeStorage.decryptString(encrypted);
    const migrated = activityTracker.migrateLegacyData(raw);
    if (migrated > 0) {
      const backupPath = `${legacyPath}.bak`;
      fs.renameSync(legacyPath, backupPath);
      logToFile('info', `[ActivityTracker] legacy data migrated to SQLite, backup at ${backupPath}`);
      activityTracker.recategorizeHistoricalData();
    }
  } catch (err) {
    logToFile('error', `[ActivityTracker] legacy migration failed: ${err.message}`);
  }
}

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

  mainWindow.once('ready-to-show', async () => {
    mainWindow.show();
    mainWindow.focus();
    if (activityTracker) {
      await activityTracker.start();
      migrateLegacyActivityData();
    }
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
      // 外部链接：白名单内直接打开，否则需要用户确认
      const allowedExternalHosts = process.env.ALLOWED_EXTERNAL_HOSTS
        ? process.env.ALLOWED_EXTERNAL_HOSTS.split(',').map(h => h.trim()).filter(Boolean)
        : [];
      if (!allowedExternalHosts.includes(hostname)) {
        const result = dialog.showMessageBoxSync(mainWindow, {
          type: 'question',
          buttons: ['取消', '打开'],
          defaultId: 0,
          cancelId: 0,
          message: `即将打开外部链接：\n${url}`,
          detail: '请确认该链接安全后再打开。',
        });
        if (result !== 1) {
          logToFile('warn', `[WindowOpen] user denied external host: ${hostname}`);
          return { action: 'deny' };
        }
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

  mainWindow.on('closed', () => { mainWindow = null; if (activityTracker) { activityTracker.stop(); } });
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
  // 无论 dev/prod，都提前确保内部 token 存在：
  // - prod: launchServer 会把它传给 standalone server；
  // - dev: 供 activity-tracker HTTP fallback 与 auto-refresh 调度器使用。
  if (!globalThis.__scholarflowInternalToken) {
    const dataDir = resolveStableDataDir(process.env, app);
    fs.mkdirSync(dataDir, { recursive: true });
    const token = getOrCreateInternalToken(dataDir);
    if (!token) {
      const msg = '无法生成内部调用 token，启动中止。请检查数据目录写入权限。';
      logToFile('fatal', msg);
      dialog.showErrorBox('ScholarFlow 启动失败', msg);
      app.quit();
      return;
    }
    globalThis.__scholarflowInternalToken = token;
    process.env.SCHOLARFLOW_INTERNAL_TOKEN = token;
  }

  setupSecureTokenIPC();
  setupSecureCredentialIPC();
  setupAuthStateIPC();

  activityTracker = createActivityTracker({
    sendToRenderer,
    log: (level, msg) => logToFile(level, msg),
    internalToken: globalThis.__scholarflowInternalToken,
    port: PORT,
  });

  setupActivityTrackerIPC();
  setupAutoUpdater();
  try {
    console.log('[SF] Starting...');
    if (!IS_DEV) {
      await launchServer();
      console.log('[SF] Waiting for port', PORT);
      await waitForPort(PORT, 60000);
    } else {
      console.log('[SF] Dev mode — launching next dev server on port', PORT);
      await launchDevServer();
      console.log('[SF] Waiting for port', PORT);
      await waitForPort(PORT, 30000);
    }
    console.log('[SF] Ready, opening window');
    setupInternalTokenRequestInterceptor();
    createWindow();

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
  if (activityTracker) { activityTracker.stop(); }
  if (autoRefreshScheduler) { autoRefreshScheduler.stop(); }
  if (serverProcess) { serverProcess.kill('SIGTERM'); serverProcess = null; }
});

// 导出纯函数供测试引用(task 8.2);在 Electron 中作为入口正常运行,
// module.exports 不影响主进程逻辑(CommonJS)。
module.exports = { resolveStableDataDir };
