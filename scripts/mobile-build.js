/**
 * 移动端构建脚本
 * 1. 临时移除不兼容静态导出的文件 (API routes + 动态路由页面)
 * 2. 执行 next build (output: export)
 * 3. 恢复被移除的文件
 * 4. 添加 Android 平台
 */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const BACKUP_DIR = path.join(ROOT, ".mobile-build-backup");

/**
 * 扫描需要临时移除的文件：
 * 1. 所有 API routes (app/api/ * /route.ts 或 route.js)
 * 2. 动态路由页面 (app/.../[...slug]/page.tsx 或 app/.../[param]/page.tsx)
 * 静态导出不允许 API 路由和动态路由。
 */
function scanExcluded() {
  const excluded = [];

  function walk(dir, callback) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full, callback);
      } else {
        callback(full, entry.name);
      }
    }
  }

  const apiDir = path.join(ROOT, "app", "api");
  walk(apiDir, (full, name) => {
    if (name === "route.ts" || name === "route.js") {
      excluded.push(path.relative(ROOT, full));
    }
  });

  const appDir = path.join(ROOT, "app");
  walk(appDir, (full, name) => {
    const rel = path.relative(ROOT, full);
    if (rel.startsWith("api" + path.sep)) return;
    const dirParts = path.dirname(rel).split(path.sep);
    const isDynamic = dirParts.some((part) => part.startsWith("["));
    if (isDynamic && (name === "page.tsx" || name === "page.ts")) {
      excluded.push(rel);
    }
  });

  return excluded;
}

let EXCLUDED = [];

function backup() {
  EXCLUDED = scanExcluded();
  console.log(`[mobile-build] 发现 ${EXCLUDED.length} 个不兼容文件，开始备份...`);
  fs.rmSync(BACKUP_DIR, { recursive: true, force: true });
  for (const rel of EXCLUDED) {
    const src = path.join(ROOT, rel);
    if (fs.existsSync(src)) {
      const dst = path.join(BACKUP_DIR, rel);
      fs.mkdirSync(path.dirname(dst), { recursive: true });
      fs.renameSync(src, dst);
      console.log(`  移除: ${rel}`);
    }
  }
}

function restore() {
  console.log("[mobile-build] 恢复文件...");
  if (!fs.existsSync(BACKUP_DIR)) return;
  for (const rel of EXCLUDED) {
    const src = path.join(BACKUP_DIR, rel);
    if (fs.existsSync(src)) {
      const dst = path.join(ROOT, rel);
      fs.mkdirSync(path.dirname(dst), { recursive: true });
      fs.renameSync(src, dst);
      console.log(`  恢复: ${rel}`);
    }
  }
  fs.rmSync(BACKUP_DIR, { recursive: true, force: true });
}

function build() {
  console.log("[mobile-build] 清除旧构建缓存...");
  fs.rmSync(path.join(ROOT, ".next"), { recursive: true, force: true });

  console.log("[mobile-build] 开始静态导出构建...");
  execSync("npx next build", {
    cwd: ROOT,
    env: { ...process.env, BUILD_TARGET: "mobile" },
    stdio: "inherit",
  });
}

function addAndroid() {
  console.log("[mobile-build] 添加 Android 平台...");
  try {
    execSync("npx cap add android", { cwd: ROOT, stdio: "inherit" });
  } catch {
    console.log("[mobile-build] Android 平台已存在，跳过");
  }
}

function syncAndroid() {
  console.log("[mobile-build] 同步到 Android...");
  execSync("npx cap sync android", { cwd: ROOT, stdio: "inherit" });
}

// Main
try {
  backup();
  build();

  if (fs.existsSync(path.join(ROOT, "out", "index.html"))) {
    console.log("[mobile-build] ✅ 静态导出成功");
    addAndroid();
    syncAndroid();
    console.log("[mobile-build] ✅ 完成！用 Android Studio 打开 android/ 目录");
    console.log("[mobile-build]    npx cap open android");
  } else {
    console.log("[mobile-build] ❌ 静态导出未生成 out/ 目录");
  }
} catch (err) {
  console.error("[mobile-build] ❌ 构建失败:", err.message);
} finally {
  restore();
}
