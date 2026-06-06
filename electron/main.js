const { app, BrowserWindow, shell, dialog, ipcMain, safeStorage } = require('electron');
const { fork } = require('child_process');
const path = require('path');
const net = require('net');
const fs = require('fs');
const { activeWindow } = require('active-win');

const PORT = process.env.ELECTRON_DEV ? 3000 : 3456;
const APP_URL = `http://localhost:${PORT}`;
const IS_DEV = !!process.env.ELECTRON_DEV;

let mainWindow = null;
let serverProcess = null;

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

// ── 启动 standalone server ──────────────────────────────────
function launchServer() {
  return new Promise((resolve, reject) => {
    const appRoot = getAppRoot();

    // Next.js standalone 模式生成的独立服务器脚本
    const serverScript = path.join(appRoot, '.next', 'standalone', 'server.js');

    console.log('[SF] App root:', appRoot);
    console.log('[SF] Server script:', serverScript);

    if (!fs.existsSync(serverScript)) {
      return reject(new Error(
        `找不到 server.js:\n${serverScript}\n\n请确保用 "npm run electron:build" 重新打包。`
      ));
    }

    // fork 比 spawn 更可靠，直接用 Node 运行，不需要 shell
    serverProcess = fork(serverScript, [], {
      cwd: path.join(appRoot, '.next', 'standalone'),
      env: {
        ...process.env,
        NODE_ENV: 'production',
        PORT: String(PORT),
        HOSTNAME: '127.0.0.1',
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

// ── 活动窗口追踪 ──────────────────────────────────────────
let activeWindowTimer = null;
let lastActiveWindow = null;

function startActiveWindowTracking() {
  if (activeWindowTimer) return;
  console.log('[SF] Activity tracking started (poll every 3s)');
  const POLL_INTERVAL = 3000;

  activeWindowTimer = setInterval(async () => {
    try {
      const win = await activeWindow();
      if (!win) { console.log('[SF] activeWindow returned null'); return; }

      const info = {
        title: win.title,
        app: win.owner?.name || 'Unknown',
        timestamp: Date.now(),
      };
      console.log('[SF] active window:', info.app, '|', info.title.slice(0, 40));

      if (!lastActiveWindow || lastActiveWindow.app !== info.app || lastActiveWindow.title !== info.title) {
        lastActiveWindow = info;
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('active-window-changed', info);
          console.log('[SF] → sent IPC to renderer');
        } else {
          console.log('[SF] → window not ready, skipped IPC');
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
    if (!url.startsWith(`http://localhost:${PORT}`)) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.webContents.on('did-fail-load', (_, code, desc) => {
    console.error('[SF] Load failed:', code, desc);
    setTimeout(() => { if (mainWindow) mainWindow.loadURL(APP_URL); }, 2500);
  });

  mainWindow.on('closed', () => { mainWindow = null; stopActiveWindowTracking(); });
}

// ── 主流程 ──────────────────────────────────────────────────
app.whenReady().then(async () => {
  setupSecureTokenIPC();
  try {
    console.log('[SF] Starting...');
    if (!IS_DEV) {
      await launchServer();
      console.log('[SF] Waiting for port', PORT);
      await waitForPort(PORT, 60000);
    } else {
      console.log('[SF] Dev mode — connecting to next dev on port 3000');
      await waitForPort(PORT, 30000);
    }
    console.log('[SF] Ready, opening window');
    createWindow();
    startActiveWindowTracking();
  } catch (err) {
    console.error('[SF] Fatal:', err);
    dialog.showErrorBox('ScholarFlow 启动失败', `${err.message}`);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (serverProcess) { serverProcess.kill(); serverProcess = null; }
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (!mainWindow) createWindow();
});

app.on('before-quit', () => {
  stopActiveWindowTracking();
  if (serverProcess) { serverProcess.kill('SIGTERM'); serverProcess = null; }
});
