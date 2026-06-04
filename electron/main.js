const { app, BrowserWindow, shell } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const net = require('net');

const PORT = 3000;
const DEV_URL = `http://localhost:${PORT}`;

let mainWindow = null;
let nextServer = null;

// 原生 TCP 探测，不依赖任何第三方模块
function waitForPort(port, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();

    function tryConnect() {
      const socket = new net.Socket();

      socket.once('connect', () => {
        socket.destroy();
        resolve();
      });

      socket.once('error', () => {
        socket.destroy();
        if (Date.now() - start > timeout) {
          reject(new Error(`Port ${port} did not open within ${timeout}ms`));
        } else {
          setTimeout(tryConnect, 300);
        }
      });

      socket.connect(port, '127.0.0.1');
    }

    tryConnect();
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 800,
    minHeight: 600,
    title: 'ScholarFlow',
    icon: path.join(__dirname, '../public/icons/icon-512.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    autoHideMenuBar: true,
    backgroundColor: '#faf7f2',
    show: false,
  });

  mainWindow.loadURL(DEV_URL);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // 外部链接在系统浏览器打开
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith('http://localhost')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startNextServer() {
  return new Promise((resolve, reject) => {
    const nextBin = path.join(
      __dirname,
      '../node_modules/.bin/next' + (process.platform === 'win32' ? '.cmd' : '')
    );

    nextServer = spawn(nextBin, ['start', '--port', String(PORT)], {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, PORT: String(PORT) },
      shell: process.platform === 'win32',
      stdio: 'pipe',
    });

    nextServer.stderr.on('data', (data) => {
      console.error('[Next.js]', data.toString());
    });

    nextServer.on('error', reject);

    // 不等 stdout，交给 waitForPort 探测
    resolve();
  });
}

app.whenReady().then(async () => {
  try {
    await startNextServer();
    await waitForPort(PORT, 40000);
    createWindow();
  } catch (err) {
    console.error('启动失败:', err);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (nextServer) {
    nextServer.kill();
    nextServer = null;
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

app.on('before-quit', () => {
  if (nextServer) {
    nextServer.kill();
    nextServer = null;
  }
});
