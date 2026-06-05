const { app, BrowserWindow, shell, dialog } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const net = require('net');
const fs = require('fs');

const PORT = 3456;
const APP_URL = `http://localhost:${PORT}`;

let mainWindow = null;
let nextProcess = null;

// ── 获取 app 根目录（兼容 asar 打包和开发模式）──────────────
function getAppRoot() {
  // __dirname = app.asar/electron/ 或 开发时的 electron/
  // asarUnpack 后 node_modules 在 app.asar.unpacked/
  const inAsar = __dirname.includes('app.asar');
  if (inAsar) {
    // app.asar.unpacked 与 app.asar 同级
    return __dirname.replace('app.asar', 'app.asar.unpacked').replace(/[/\\]electron$/, '');
  }
  return path.join(__dirname, '..');
}

// ── 探测端口 ────────────────────────────────────────────────
function waitForPort(port, timeoutMs = 50000) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;

    function attempt() {
      const sock = new net.Socket();
      sock.setTimeout(800);

      sock.once('connect', () => { sock.destroy(); resolve(); });

      sock.once('error', () => {
        sock.destroy();
        if (Date.now() >= deadline) reject(new Error(`Port ${port} timeout`));
        else setTimeout(attempt, 500);
      });

      sock.once('timeout', () => {
        sock.destroy();
        if (Date.now() >= deadline) reject(new Error(`Port ${port} timeout`));
        else setTimeout(attempt, 500);
      });

      sock.connect(port, '127.0.0.1');
    }

    attempt();
  });
}

// ── 启动 Next.js ────────────────────────────────────────────
function launchNext() {
  return new Promise((resolve, reject) => {
    const appRoot = getAppRoot();
    console.log('[SF] App root:', appRoot);

    // 查找 next 可执行文件
    const candidates = [
      path.join(appRoot, 'node_modules', '.bin', 'next.cmd'),
      path.join(appRoot, 'node_modules', '.bin', 'next'),
      path.join(appRoot, 'node_modules', 'next', 'dist', 'bin', 'next'),
    ];

    let nextBin = null;
    for (const c of candidates) {
      if (fs.existsSync(c)) { nextBin = c; break; }
    }

    if (!nextBin) {
      return reject(new Error(`找不到 next 可执行文件。尝试路径:\n${candidates.join('\n')}`));
    }

    console.log('[SF] Using next bin:', nextBin);

    nextProcess = spawn(nextBin, ['start', '--port', String(PORT)], {
      cwd: appRoot,
      shell: process.platform === 'win32',
      env: {
        ...process.env,
        NODE_ENV: 'production',
        PORT: String(PORT),
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    nextProcess.stdout.on('data', d => console.log('[Next]', d.toString().trim()));
    nextProcess.stderr.on('data', d => console.error('[Next ERR]', d.toString().trim()));

    nextProcess.on('error', err => {
      console.error('[SF] spawn error:', err);
      reject(err);
    });

    nextProcess.on('exit', code => {
      if (code && code !== 0) console.warn('[SF] next exited with code', code);
    });

    setTimeout(resolve, 300);
  });
}

// ── 创建窗口 ────────────────────────────────────────────────
function createWindow() {
  const iconPath = path.join(getAppRoot(), 'public', 'icons', 'logo.png');

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
    },
    autoHideMenuBar: true,
    backgroundColor: '#faf7f2',
    show: false,
  });

  mainWindow.loadURL(APP_URL);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
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

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ── 主流程 ──────────────────────────────────────────────────
app.whenReady().then(async () => {
  try {
    console.log('[SF] Starting...');
    await launchNext();
    console.log('[SF] Waiting for port', PORT, '...');
    await waitForPort(PORT, 50000);
    console.log('[SF] Ready, opening window');
    createWindow();
  } catch (err) {
    console.error('[SF] Fatal:', err);
    dialog.showErrorBox(
      'ScholarFlow 启动失败',
      `服务器无法启动。\n\n${err.message}\n\n请重新安装应用。`
    );
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (nextProcess) { nextProcess.kill(); nextProcess = null; }
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (!mainWindow && nextProcess) createWindow();
});

app.on('before-quit', () => {
  if (nextProcess) { nextProcess.kill('SIGTERM'); nextProcess = null; }
});
