/**
 * Next.js standalone 模式构建后处理：
 * 将 public/ 和 .next/static/ 复制到 .next/standalone/ 下
 * 这样 server.js 才能找到静态资源
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const standaloneDir = path.join(root, '.next', 'standalone');

function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    console.log(`[postbuild] 跳过不存在的目录: ${src}`);
    return;
  }
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

console.log('[postbuild] 复制 public/ → .next/standalone/public/');
copyDir(
  path.join(root, 'public'),
  path.join(standaloneDir, 'public')
);

console.log('[postbuild] 复制 .next/static/ → .next/standalone/.next/static/');
copyDir(
  path.join(root, '.next', 'static'),
  path.join(standaloneDir, '.next', 'static')
);

console.log('[postbuild] 完成！');
