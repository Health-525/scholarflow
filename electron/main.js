const { app, BrowserWindow, shell, dialog, ipcMain, safeStorage, session } = require('electron');
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
  const exeDir = path.dirname(app.getPath('exe'));
  const candidates = [
    // 1. D:\A\vision-model（开发模式：项目根目录）
    path.join(__dirname, '..', '..', 'vision-model'),
    // 2. exe 同级目录（部署模式：ScholarFlow.exe 旁边放 vision-model/）
    path.join(exeDir, 'vision-model'),
  ];
  for (const dir of candidates) {
    const serverPath = path.join(dir, 'src', 'api', 'server.py');
    if (fs.existsSync(serverPath)) return dir;
  }
  // 3. 读取 exe 同级的 vision-model-path.txt（一行，写入 vision-model 的绝对路径）
  const pathFile = path.join(exeDir, 'vision-model-path.txt');
  if (fs.existsSync(pathFile)) {
    const customDir = fs.readFileSync(pathFile, 'utf-8').trim();
    if (customDir && fs.existsSync(path.join(customDir, 'src', 'api', 'server.py'))) {
      return customDir;
    }
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

// ── IPC: 桌面宠物 ────────────────────────────────────────
let petWindow = null;

ipcMain.handle('pet:show', async () => {
  if (petWindow && !petWindow.isDestroyed()) {
    petWindow.show();
    return { ok: true };
  }

  petWindow = new BrowserWindow({
    width: 160,
    height: 180,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  petWindow.setVisibleOnAllWorkspaces(true);
  petWindow.setAlwaysOnTop(true, 'floating');

  // 加载宠物页面
  const petPath = path.join(__dirname, 'pet.html');
  petWindow.loadFile(petPath);

  // 右下角位置
  const { width: screenW, height: screenH } = require('electron').screen.getPrimaryDisplay().workAreaSize;
  petWindow.setPosition(screenW - 180, screenH - 200);

  petWindow.on('closed', () => { petWindow = null; });

  // 右键关闭
  ipcMain.once('pet:close', () => {
    if (petWindow && !petWindow.isDestroyed()) petWindow.close();
  });

  return { ok: true };
});

ipcMain.handle('pet:hide', async () => {
  if (petWindow && !petWindow.isDestroyed()) petWindow.close();
  return { ok: true };
});

ipcMain.handle('pet:status', async () => {
  return { visible: petWindow !== null && !petWindow.isDestroyed() };
});

// ── IPC: 抬头纹后台监控 ──────────────────────────────────
let browMonitorProcess = null;

ipcMain.handle('brow-monitor:start', async () => {
  if (browMonitorProcess && !browMonitorProcess.killed) {
    return { ok: true, message: '监控已运行' };
  }
  const vmDir = findVisionModelDir();
  console.log('[SF] brow-monitor:start vmDir =', vmDir);
  if (!vmDir) return { ok: false, message: '未找到vision-model目录' };

  const { spawn } = require('child_process');
  const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';

  browMonitorProcess = spawn(pythonCmd, ['src/brow_monitor_daemon.py'], {
    cwd: vmDir,
    env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
    stdio: 'pipe',
    shell: true,
  });

  console.log('[SF] brow-monitor spawned PID =', browMonitorProcess.pid, 'killed =', browMonitorProcess.killed);

  browMonitorProcess.stdout?.on('data', d => {
    const line = d.toString().trim();
    if (line) console.log('[BrowMonitor]', line);
    // 检测ALERT行，转发到宠物窗口（IPC比HTTP轮询更快）
    if (line.includes('[BrowMonitor] ALERT:')) {
      const match = line.match(/评分\s+(\d+)/);
      const score = match ? parseInt(match[1]) : 50;
      if (petWindow && !petWindow.isDestroyed()) {
        petWindow.webContents.send('brow-alert', { score });
      }
    }
  });
  browMonitorProcess.stderr?.on('data', d => {
    const line = d.toString().trim();
    if (line) console.error('[BrowMonitor ERR]', line);
  });
  browMonitorProcess.on('exit', code => {
    console.log('[BrowMonitor] exited with code', code);
    browMonitorProcess = null;
  });

  return { ok: true, message: '监控已启动' };
});

ipcMain.handle('brow-monitor:stop', async () => {
  if (browMonitorProcess && !browMonitorProcess.killed) {
    browMonitorProcess.kill();
    browMonitorProcess = null;
    return { ok: true, message: '监控已停止' };
  }
  return { ok: true, message: '监控未运行' };
});

ipcMain.handle('brow-monitor:status', async () => {
  const running = browMonitorProcess !== null && !browMonitorProcess.killed;
  console.log('[SF] brow-monitor:status =', running, 'process =', browMonitorProcess?.pid);
  return { running };
});

// IPC: 动态更新 titleBarOverlay 颜色（跟随主题）
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

// ── 图书馆座位数据获取（VPN代理模式）──────────────────────────
const http = require('http');
const SSO_LOGIN_URL = 'https://vpnlib.njtech.edu.cn/enlink/sso/login';
const LIB_URL_VPN = 'https://vpnlib.njtech.edu.cn/https/webvpn0c5f34c56af636878cf47cc94ad9e75558ae631157ae3a788556cf416867bf92/web/index.html';
const LIB_GRAPHQL_VPN = 'https://vpnlib.njtech.edu.cn/https/7765772e7a65612e6e6a746563682e6564752e636e/index.php/graphql/';
let libraryLoginWindow = null;
let loginNavigatedToLib = false;

// 同步 JWT 到 scholarflow API
function syncJWTToApp(jwtValue) {
  const body = JSON.stringify({ cookie: `Authorization=${jwtValue}` });
  return new Promise(resolve => {
    const req = http.request({
      hostname: '127.0.0.1', port: PORT, path: '/api/auth/jwt',
      method: 'POST', headers: { 'Content-Type': 'application/json' },
    }, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve({ ok: false }); } }); });
    req.on('error', () => resolve({ ok: false }));
    req.write(body); req.end();
  });
}

// 从 JWT 解析过期时间
function parseJWTExpiry(token) {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    return payload.expireAt || 0;
  } catch { return 0; }
}

// 检查当前 JWT 是否有效
async function checkCurrentJWT() {
  try {
    const r = await new Promise(resolve => {
      const req = http.request({
        hostname: '127.0.0.1', port: PORT, path: '/api/auth/jwt',
        method: 'GET',
      }, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve({ valid: false }); } }); });
      req.on('error', () => resolve({ valid: false }));
      req.setTimeout(3000, () => { req.destroy(); resolve({ valid: false }); });
      req.end();
    });
    return r.valid === true;
  } catch { return false; }
}

// 弹出登录窗口
async function openLibraryLoginWindow() {
  if (libraryLoginWindow && !libraryLoginWindow.isDestroyed()) {
    libraryLoginWindow.focus();
    return { ok: true, message: '登录窗口已打开' };
  }

  // 使用独立session + 持久化，避免跟主窗口session冲突
  const loginSession = session.fromPartition('persist:library-login');

  // 清除可能损坏的缓存，防止白屏
  try {
    await loginSession.clearCache();
    await loginSession.clearStorageData({ storages: ['shadercache', 'serviceworkers'] });
    console.log('[SF] Library login session cache cleared');
  } catch (e) {
    console.log('[SF] Library login session cache clear failed:', e.message);
  }

  libraryLoginWindow = new BrowserWindow({
    width: 900, height: 700,
    title: '图书馆登录 · ScholarFlow',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      partition: 'persist:library-login',
    },
  });

  // 忽略VPN证书错误（VPN代理可能有自签名证书）
  loginSession.setCertificateVerifyProc((request, callback) => {
    const { hostname } = request;
    if (hostname.includes('njtech.edu.cn')) {
      callback(0); // 信任
    } else {
      callback(-2); // 使用默认验证
    }
  });

  // 设置Chrome UA，防止网站拒绝Electron
  libraryLoginWindow.webContents.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
  );

  // 用 onHeadersReceived 拦截 Set-Cookie 捕获 JWT（即使httpOnly也能拿到）
  let jwtCaptured = false;
  loginSession.webRequest.onHeadersReceived((details, callback) => {
    const setCookie = details.responseHeaders?.['set-cookie'] || details.responseHeaders?.['Set-Cookie'];
    if (setCookie && !jwtCaptured) {
      for (const cookieStr of setCookie) {
        if (cookieStr.startsWith('Authorization=')) {
          const jwtValue = cookieStr.split(';')[0].split('=')[1];
          if (jwtValue) {
            jwtCaptured = true;
            const expireAt = parseJWTExpiry(jwtValue);
            if (expireAt * 1000 > Date.now()) {
              syncJWTToApp(jwtValue).then(result => {
                if (result.ok) {
                  console.log('[SF] Library JWT captured from Set-Cookie header, expires:', new Date(expireAt * 1000).toISOString());
                  if (libraryLoginWindow && !libraryLoginWindow.isDestroyed()) libraryLoginWindow.close();
                  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('library:jwt-refreshed', { ok: true, expiry: new Date(expireAt * 1000).toISOString() });
                }
              });
            }
          }
        }
      }
    }
    callback({ cancel: false, responseHeaders: details.responseHeaders });
  });

  loginNavigatedToLib = false;
  libraryLoginWindow.loadURL(LIB_URL_VPN);

  // 白屏检测：如果多次加载后仍无内容，用devtools检查
  let whiteScreenRetries = 0;
  const whiteScreenCheck = setInterval(async () => {
    if (!libraryLoginWindow || libraryLoginWindow.isDestroyed()) {
      clearInterval(whiteScreenCheck);
      return;
    }
    try {
      // 用 webContents.getTitle() 和 getURL() 判断页面是否正常加载
      const title = libraryLoginWindow.webContents.getTitle();
      const url = libraryLoginWindow.webContents.getURL();
      // 如果URL是about:blank或空，说明没加载成功
      if ((!url || url === 'about:blank') && whiteScreenRetries < 3) {
        whiteScreenRetries++;
        console.log('[SF] Library login: blank page detected, reloading...', whiteScreenRetries);
        libraryLoginWindow.loadURL(LIB_URL_VPN);
      } else if (url && url !== 'about:blank') {
        // 页面已加载，停止检测
        clearInterval(whiteScreenCheck);
      }
    } catch {
      clearInterval(whiteScreenCheck);
    }
  }, 3000);

  // 登录完成后检查cookie和localStorage提取JWT
  libraryLoginWindow.webContents.on('did-finish-load', async () => {
    if (!libraryLoginWindow || libraryLoginWindow.isDestroyed()) return;
    const url = libraryLoginWindow.webContents.getURL();
    // 只在图书馆页面检查
    if (!url.includes('vpnlib.njtech.edu.cn/https/')) return;

    try {
      // 方法1: 检查session cookies
      const allCookies = await loginSession.cookies.get({});
      const authCookie = allCookies.find(c => c.name === 'Authorization');
      if (authCookie?.value) {
        const expireAt = parseJWTExpiry(authCookie.value);
        if (expireAt * 1000 > Date.now()) {
          const result = await syncJWTToApp(authCookie.value);
          if (result.ok) {
            console.log('[SF] Library JWT from session cookie, expires:', new Date(expireAt * 1000).toISOString());
            if (libraryLoginWindow && !libraryLoginWindow.isDestroyed()) libraryLoginWindow.close();
            if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('library:jwt-refreshed', { ok: true, expiry: new Date(expireAt * 1000).toISOString() });
            return;
          }
        }
      }

      // 方法2: 检查localStorage里的user对象（VPN代理下JWT可能在这里）
      const userStr = await libraryLoginWindow.webContents.executeJavaScript(`localStorage.getItem('user')`);
      if (userStr) {
        const userObj = JSON.parse(userStr);
        if (userObj.token || userObj.jwt || userObj.access_token) {
          const token = userObj.token || userObj.jwt || userObj.access_token;
          const expireAt = parseJWTExpiry(token);
          if (expireAt * 1000 > Date.now()) {
            const result = await syncJWTToApp(token);
            if (result.ok) {
              console.log('[SF] Library JWT from localStorage.user, expires:', new Date(expireAt * 1000).toISOString());
              if (libraryLoginWindow && !libraryLoginWindow.isDestroyed()) libraryLoginWindow.close();
              if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('library:jwt-refreshed', { ok: true, expiry: new Date(expireAt * 1000).toISOString() });
              return;
            }
          }
        }
      }

      // 方法3: 用 document.cookie 检查（非httpOnly的cookie）
      const docCookies = await libraryLoginWindow.webContents.executeJavaScript(`document.cookie`);
      const authMatch = docCookies.match(/Authorization=([^;]+)/);
      if (authMatch) {
        const jwtValue = authMatch[1];
        const expireAt = parseJWTExpiry(jwtValue);
        if (expireAt * 1000 > Date.now()) {
          const result = await syncJWTToApp(jwtValue);
          if (result.ok) {
            console.log('[SF] Library JWT from document.cookie, expires:', new Date(expireAt * 1000).toISOString());
            if (libraryLoginWindow && !libraryLoginWindow.isDestroyed()) libraryLoginWindow.close();
            if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('library:jwt-refreshed', { ok: true, expiry: new Date(expireAt * 1000).toISOString() });
            return;
          }
        }
      }

      // 记录调试信息
      const cookieNames = allCookies.map(c => `${c.name}(${c.domain})`).join(', ');
      console.log('[SF] Library login: no JWT found. cookies:', cookieNames, 'hasUser:', !!userStr);
    } catch (e) {
      console.error('[SF] Library JWT extraction error:', e.message);
    }
  });

  libraryLoginWindow.on('closed', () => {
    loginSession.webRequest.onHeadersReceived(null);
    libraryLoginWindow = null;
  });

  return { ok: true, message: '登录窗口已打开' };
}

// IPC: 刷新 JWT（先尝试自动，失败则弹窗）
ipcMain.handle('library:refresh-jwt', async () => {
  // 先检查现有JWT是否还有效
  if (await checkCurrentJWT()) {
    return { ok: true, message: 'JWT仍然有效' };
  }
  // 无效则弹登录窗口
  return await openLibraryLoginWindow();
});

// IPC: 打开登录窗口
ipcMain.handle('library:login', async () => {
  return await openLibraryLoginWindow();
});

// 启动时自动尝试续期 + 定时自动续期
const JWT_REFRESH_INTERVAL = 30 * 60 * 1000; // 30分钟
let jwtRefreshTimer = null;

function autoRefreshLibraryJWT() {
  // 启动8秒后检查JWT，过期则通知前端
  setTimeout(async () => {
    const valid = await checkCurrentJWT();
    if (valid) {
      console.log('[SF] Library JWT still valid');
    } else {
      console.log('[SF] Library JWT expired, user needs to login');
      // 通知前端
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('library:jwt-expired');
      }
    }
  }, 8000);
}

function startJWTAutoRefresh() {
  if (jwtRefreshTimer) return;
  jwtRefreshTimer = setInterval(async () => {
    const valid = await checkCurrentJWT();
    if (!valid) {
      console.log('[SF] Library JWT expired during periodic check');
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('library:jwt-expired');
      }
    }
  }, JWT_REFRESH_INTERVAL);
  console.log('[SF] Library JWT auto-refresh check every', JWT_REFRESH_INTERVAL / 60000, 'min');
}

function stopJWTAutoRefresh() {
  if (jwtRefreshTimer) {
    clearInterval(jwtRefreshTimer);
    jwtRefreshTimer = null;
  }
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

    // Auto-refresh library JWT (non-blocking)
    autoRefreshLibraryJWT();
    startJWTAutoRefresh();
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
  stopJWTAutoRefresh();
  if (serverProcess) { serverProcess.kill('SIGTERM'); serverProcess = null; }
  if (visionModelProcess) { visionModelProcess.kill(); visionModelProcess = null; }
});
