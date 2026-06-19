const { app, BrowserWindow, shell, dialog, ipcMain, safeStorage, session } = require('electron');

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

// ── 图书馆座位数据获取（VPN代理模式）──────────────────────────
const http = require('http');
const net = require('net');

const { activeWindow } = require('active-win');
const { autoUpdater } = require('electron-updater');
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
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        [INTERNAL_TOKEN_HEADER]: globalThis.__scholarflowInternalToken,
      },
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
        headers: {
          [INTERNAL_TOKEN_HEADER]: globalThis.__scholarflowInternalToken,
        },
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

  // 证书校验：生产环境默认使用系统信任库；仅在开发环境或显式开启
  // LIBRARY_ALLOW_INSECURE 时才为校内/VPN 域名放宽校验，并记录审计日志。
  const allowInsecure = IS_DEV || process.env.LIBRARY_ALLOW_INSECURE === 'true';
  if (allowInsecure) {
    // 使用正则锚定到域名末尾，防止 evil-njtech.edu.cn.attacker.com 等绕过。
    const TRUSTED_HOST_RE = /^(?:[a-z0-9-]+\.)*njtech\.edu\.cn$/i;
    loginSession.setCertificateVerifyProc((request, callback) => {
      const { hostname } = request;
      if (TRUSTED_HOST_RE.test(hostname)) {
        logToFile('warn', `[LibraryLogin] certificate trust bypassed for ${hostname}`);
        callback(0); // 信任
      } else {
        callback(-2); // 使用默认验证
      }
    });
  }

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
      console.log('[SF] Dev mode — connecting to next dev on port 3000');
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

    // Auto-refresh library JWT (non-blocking)
    autoRefreshLibraryJWT();
    startJWTAutoRefresh();
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
  stopJWTAutoRefresh();
  if (autoRefreshScheduler) { autoRefreshScheduler.stop(); }
  if (serverProcess) { serverProcess.kill('SIGTERM'); serverProcess = null; }
});

// 导出纯函数供测试引用(task 8.2);在 Electron 中作为入口正常运行,
// module.exports 不影响主进程逻辑(CommonJS)。
module.exports = { resolveStableDataDir };
