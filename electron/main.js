const { app, BrowserWindow, shell, dialog, ipcMain, safeStorage } = require('electron');
const { fork } = require('child_process');
const path = require('path');
const net = require('net');
const fs = require('fs');
const { activeWindow } = require('active-win');
const { autoUpdater } = require('electron-updater');

const PORT = process.env.ELECTRON_DEV ? 3000 : 3456;
const APP_URL = `http://localhost:${PORT}`;
const IS_DEV = !!process.env.ELECTRON_DEV;

let mainWindow = null;
let serverProcess = null;
let visionModelProcess = null;

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

    // fork 比 spawn 更可靠，直接用 Node 运行，不需要 shell
    const cwd = path.dirname(serverScript);
    serverProcess = fork(serverScript, [], {
      cwd,
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

// ── 启动 Vision-Model API (FastAPI on :8000) ──────────────
function findVisionModelDir() {
  const candidates = [
    path.join(__dirname, '..', '..', 'vision-model'),
    path.join(__dirname, '..', '..', '..', 'vision-model'),
    path.join(process.cwd(), '..', 'vision-model'),
  ];
  for (const dir of candidates) {
    const serverPath = path.join(dir, 'src', 'api', 'server.py');
    if (fs.existsSync(serverPath)) return dir;
  }
  return null;
}

function launchVisionModel() {
  const vmDir = findVisionModelDir();
  if (!vmDir) {
    console.log('[SF] Vision-Model directory not found, skipping');
    return false;
  }

  // 检查 8000 端口是否已占用
  return new Promise((resolve) => {
    const sock = new net.Socket();
    sock.setTimeout(500);
    sock.once('connect', () => {
      sock.destroy();
      console.log('[SF] Vision-Model already running on :8000');
      resolve(true);
    });
    sock.once('error', () => {
      sock.destroy();
      // 端口空闲，启动服务
      console.log('[SF] Launching Vision-Model from', vmDir);
      const { spawn } = require('child_process');
      const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';

      visionModelProcess = spawn(pythonCmd, ['src/api/server.py'], {
        cwd: vmDir,
        env: { ...process.env },
        stdio: 'pipe',
        shell: true,
      });

      visionModelProcess.stdout && visionModelProcess.stdout.on('data', d => {
        console.log('[VisionModel]', d.toString().trim());
      });
      visionModelProcess.stderr && visionModelProcess.stderr.on('data', d => {
        console.error('[VisionModel ERR]', d.toString().trim());
      });
      visionModelProcess.on('error', (err) => {
        console.error('[SF] Vision-Model launch error:', err.message);
        resolve(false);
      });
      visionModelProcess.on('exit', (code) => {
        console.log('[SF] Vision-Model exited with code', code);
        visionModelProcess = null;
      });

      // 给 3 秒启动时间，不阻塞主流程
      setTimeout(() => resolve(true), 3000);
    });
    sock.once('timeout', () => {
      sock.destroy();
      resolve(false);
    });
    sock.connect(8000, '127.0.0.1');
  });
}

// ── IPC: 启动/检查 Vision-Model ───────────────────────────
ipcMain.handle('vision-model:status', async () => {
  return new Promise((resolve) => {
    const sock = new net.Socket();
    sock.setTimeout(1500);
    sock.once('connect', () => { sock.destroy(); resolve(true); });
    sock.once('error', () => { sock.destroy(); resolve(false); });
    sock.once('timeout', () => { sock.destroy(); resolve(false); });
    sock.connect(8000, '127.0.0.1');
  });
});

ipcMain.handle('vision-model:start', async () => {
  const running = await ipcMain.handle('vision-model:status');
  if (running) return { ok: true, message: '已运行' };
  const result = await launchVisionModel();
  return { ok: result, message: result ? '启动成功' : '启动失败' };
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
  setupAutoUpdater();
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

    // Auto-refresh local data
    try {
      const { execSync } = require('child_process');
      const timetableDir = path.join(__dirname, '..', '..', 'timetable');
      if (require('fs').existsSync(timetableDir)) {
        console.log('[SF] Auto-refreshing local data...');
        setTimeout(() => {
          try { execSync('node scripts/ci/dashboard-summary.js', { cwd: timetableDir, timeout: 15000, stdio: 'pipe' }); } catch {}
        }, 3000);
      }
    } catch {}

    // Auto-launch Vision-Model API (non-blocking)
    setTimeout(async () => {
      try {
        const launched = await launchVisionModel();
        console.log('[SF] Vision-Model launch:', launched ? 'success' : 'skipped');
      } catch (err) {
        console.log('[SF] Vision-Model launch skipped:', err.message);
      }
    }, 5000);
  } catch (err) {
    console.error('[SF] Fatal:', err);
    dialog.showErrorBox('ScholarFlow 启动失败', `${err.message}`);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (serverProcess) { serverProcess.kill(); serverProcess = null; }
  if (visionModelProcess) { visionModelProcess.kill(); visionModelProcess = null; }
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (!mainWindow) createWindow();
});

app.on('before-quit', () => {
  stopActiveWindowTracking();
  if (serverProcess) { serverProcess.kill('SIGTERM'); serverProcess = null; }
  if (visionModelProcess) { visionModelProcess.kill(); visionModelProcess = null; }
});
