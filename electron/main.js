const { app, BrowserWindow, shell } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const waitOn = require('wait-on');

const PORT = 3000;
const DEV_URL = `http://localhost:${PORT}`;

let mainWindow = null;
let nextServer = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 800,
    minHeight: 600,
    title: 'ScholarFlow',
    // 使用应用图标
    icon: path.join(__dirname, '../public/icons/icon-512.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      // 允许加载本地 Next.js 服务
      webSecurity: true,
    },
    // 隐藏默认菜单栏（保留右键菜单）
    autoHideMenuBar: true,
    backgroundColor: '#faf7f2',
    show: false, // 等加载完再显示，避免白屏闪烁
  });

  mainWindow.loadURL(DEV_URL);

  // 加载完成后再显示窗口
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // 外部链接在系统浏览器中打开
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
    // 在打包后的 app 内启动 next start
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

    nextServer.stdout.on('data', (data) => {
      const str = data.toString();
      if (str.includes('Ready') || str.includes('ready')) {
        resolve();
      }
    });

    nextServer.stderr.on('data', (data) => {
      console.error('[Next.js]', data.toString());
    });

    nextServer.on('error', reject);

    // 超时兜底：最多等 30 秒
    setTimeout(() => resolve(), 30000);
  });
}

app.whenReady().then(async () => {
  try {
    // 启动 Next.js 服务器
    await startNextServer();

    // 等待端口就绪
    await waitOn({ resources: [`tcp:${PORT}`], timeout: 30000 });

    createWindow();
  } catch (err) {
    console.error('启动失败:', err);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  // 关闭 Next.js 进程
  if (nextServer) {
    nextServer.kill();
    nextServer = null;
  }
  // macOS 保留 dock 图标行为
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// 退出时清理
app.on('before-quit', () => {
  if (nextServer) {
    nextServer.kill();
    nextServer = null;
  }
});
