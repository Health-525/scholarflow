/**
 * Next.js standalone 模式构建后处理：
 * 1. 将 public/ 和 .next/static/ 复制到 .next/standalone/ 下
 * 2. 补齐 Next.js standalone 可能漏掉的 node_modules，确保 server.js 在打包后能独立运行
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

function copyPackage(src, dest) {
  if (fs.existsSync(dest)) {
    fs.rmSync(dest, { recursive: true, force: true });
  }
  copyDir(src, dest);
}

function parsePackageRel(filePath) {
  // 从 NFT 文件中的相对路径解析出包根目录
  // 例如 node_modules/next/dist/... -> node_modules/next
  // 例如 node_modules/@scope/pkg/dist/... -> node_modules/@scope/pkg
  const parts = filePath.replace(/\\/g, '/').split('/');
  const idx = parts.indexOf('node_modules');
  if (idx === -1) return null;
  const scopeOrName = parts[idx + 1];
  if (!scopeOrName) return null;
  if (scopeOrName.startsWith('@')) {
    return parts.slice(idx, idx + 3).join('/');
  }
  return parts.slice(idx, idx + 2).join('/');
}

function resolvePackage(name, fromPkgRel) {
  // 模拟 Node 模块解析：从 fromPkgRel 所在目录向上查找 node_modules/<name>
  let current = path.dirname(path.join(root, fromPkgRel));
  while (current.length >= root.length) {
    const candidate = path.join(current, 'node_modules', name);
    if (fs.existsSync(candidate)) {
      return path.relative(root, candidate).replace(/\\/g, '/');
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return null;
}

function collectStandalonePackages() {
  const packages = new Set();
  const serverDir = path.join(standaloneDir, '.next', 'server');
  if (!fs.existsSync(serverDir)) return packages;

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name.endsWith('.nft.json')) {
        const data = JSON.parse(fs.readFileSync(full, 'utf8'));
        for (const rel of data.files || []) {
          const pkgRel = parsePackageRel(rel);
          if (pkgRel) packages.add(pkgRel);
        }
      }
    }
  }
  walk(serverDir);
  return packages;
}

function collectDependencies(seedPackages) {
  const queue = Array.from(seedPackages);
  const seen = new Set(queue);

  for (let i = 0; i < queue.length; i++) {
    const pkgRel = queue[i];
    const pkgJsonPath = path.join(root, pkgRel, 'package.json');
    if (!fs.existsSync(pkgJsonPath)) continue;

    let pkgJson;
    try {
      pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
    } catch {
      continue;
    }

    const deps = {
      ...pkgJson.dependencies,
      ...pkgJson.optionalDependencies,
    };

    for (const name of Object.keys(deps)) {
      const depRel = resolvePackage(name, pkgRel);
      if (!depRel || seen.has(depRel)) continue;
      seen.add(depRel);
      queue.push(depRel);
    }
  }

  return queue;
}

/**
 * 显式确保 better-sqlite3（含 build/Release/*.node 原生模块）被复制进
 * standalone 的 node_modules。NFT 静态追踪对 `require("better-sqlite3")`
 * 这类原生依赖可能漏掉，且其 .node 二进制必须随包分发，故此处做确定性兜底。
 * 同时处理 Next.js 15 monorepo 检测产生的 scholarflow/ 子目录。
 */
function getElectronVersion() {
  // 优先读 electron 包的真实版本，回退到 devDependencies 范围号去掉 ^ ~
  try {
    const v = require(path.join(root, 'node_modules', 'electron', 'package.json')).version;
    if (v) return v;
  } catch { /* ignore */ }
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    const range = (pkg.devDependencies && pkg.devDependencies.electron) || '';
    const m = range.match(/\d+\.\d+\.\d+/);
    if (m) return m[0];
  } catch { /* ignore */ }
  return null;
}

/**
 * 确保 node_modules/better-sqlite3 的原生 .node 是针对 Electron 运行时 ABI 编译的。
 *
 * 关键：standalone server 由 Electron 二进制（ELECTRON_RUN_AS_NODE）运行，使用 Electron 的
 * ABI（如 Electron 42 = NODE_MODULE_VERSION 146），而非系统 Node 的 ABI（137）。
 * `npm install` / electron-builder 的 npmRebuild 往往装成系统 Node ABI，导致打包后
 * 加载报 "compiled against a different Node.js version"。此处用 prebuild-install 拉取
 * 与 Electron 版本匹配的预编译二进制（无需本地 C++ 编译器）。
 */
function ensureElectronAbiBinary(src) {
  console.log('[postbuild] 为 better-sqlite3 对齐 Electron ABI ...');
  const { execFileSync } = require('child_process');
  try {
    execFileSync(
      process.execPath,
      [path.join(root, 'scripts', 'switch-abi.js'), 'electron'],
      { cwd: root, stdio: 'inherit' }
    );
  } catch (e) {
    console.log('[postbuild] WARNING: ABI 对齐失败,打包产物可能 ABI 不匹配:', e.message);
  }
}

function ensureBetterSqlite3() {
  const src = path.join(root, 'node_modules', 'better-sqlite3');
  if (!fs.existsSync(src)) {
    console.log('[postbuild] WARNING: 未找到 node_modules/better-sqlite3，跳过原生模块兜底复制');
    return;
  }

  // 复制进 standalone 之前，先把源目录的 .node 对齐到 Electron ABI
  ensureElectronAbiBinary(src);

  const targets = [path.join(standaloneDir, 'node_modules', 'better-sqlite3')];
  const sfDir = path.join(standaloneDir, 'scholarflow');
  if (fs.existsSync(sfDir)) {
    targets.push(path.join(sfDir, 'node_modules', 'better-sqlite3'));
  }

  for (const dest of targets) {
    copyPackage(src, dest);
    console.log(`[postbuild] 已复制 better-sqlite3（含原生 .node）→ ${path.relative(root, dest)}`);
  }
}

function copyStandaloneNodeModules() {
  if (!fs.existsSync(standaloneDir)) {
    console.log('[postbuild] 未找到 .next/standalone，跳过 node_modules 补齐');
    return;
  }

  const seed = collectStandalonePackages();
  if (seed.size === 0) {
    console.log('[postbuild] 未从 NFT 发现 node_modules 依赖，跳过补齐');
    return;
  }

  const packages = collectDependencies(seed);
  let copied = 0;
  for (const pkgRel of packages) {
    const src = path.join(root, pkgRel);
    const dest = path.join(standaloneDir, pkgRel);
    if (!fs.existsSync(src)) {
      console.log(`[postbuild] WARNING: 找不到源包 ${pkgRel}`);
      continue;
    }
    copyPackage(src, dest);
    copied++;
  }

  console.log(`[postbuild] 已补齐 ${copied} 个 node_modules 包到 standalone`);
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

// Next.js 15 monorepo detection: also copy to scholarflow subdir
const sfDir = path.join(standaloneDir, 'scholarflow');
if (fs.existsSync(sfDir)) {
  console.log('[postbuild] 复制到 scholarflow/ 子目录...');
  copyDir(path.join(root, 'public'), path.join(sfDir, 'public'));
  copyDir(path.join(root, '.next', 'static'), path.join(sfDir, '.next', 'static'));
}

// 关键修复：把 Next.js standalone 运行所需的 node_modules 补齐到 standalone 内部
console.log('[postbuild] 补齐 .next/standalone/node_modules ...');
copyStandaloneNodeModules();

// 确定性兜底：确保 better-sqlite3 原生模块进入 standalone node_modules
console.log('[postbuild] 确保 better-sqlite3 原生模块进入 standalone ...');
ensureBetterSqlite3();

console.log('[postbuild] 完成！');

// 自动生成 vision-model-path.txt 到 dist 输出目录
const distDir = path.join(root, 'dist', 'win-unpacked');
if (fs.existsSync(distDir)) {
  const pathFile = path.join(distDir, 'vision-model-path.txt');
  const vmDir = path.join(root, '..', 'vision-model');
  const vmDirAbsolute = path.resolve(vmDir);
  if (fs.existsSync(path.join(vmDirAbsolute, 'src', 'api', 'server.py'))) {
    fs.writeFileSync(pathFile, vmDirAbsolute, 'utf-8');
    console.log(`[postbuild] 写入 vision-model-path.txt → ${vmDirAbsolute}`);
  } else {
    console.log(`[postbuild] WARNING: vision-model not found at ${vmDirAbsolute}`);
  }
}
