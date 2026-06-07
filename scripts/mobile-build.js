/**
 * 移动端构建脚本
 * 1. 临时移除不兼容静态导出的文件 (API routes + 动态路由页面)
 * 2. 执行 next build (output: export)
 * 3. 恢复被移除的文件
 * 4. 添加 Android 平台
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const BACKUP_DIR = path.join(ROOT, ".mobile-build-backup");

// 需要临时移除的文件（API routes + "use client" 动态路由）
const EXCLUDED = [
  "app/api/auth/jwt/route.ts",
  "app/api/jwc-news/route.ts",
  "app/api/local-data/route.ts",
  "app/api/local-save/route.ts",
  "app/api/vpn-proxy/route.ts",
  "app/notes/[...path]/page.tsx",
  "app/reports/daily/[date]/page.tsx",
  "app/reports/weekly/[slug]/page.tsx",
  "app/manifest.webmanifest/route.ts",
];

function backup() {
  console.log("[mobile-build] 备份不兼容文件...");
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
  // 也需要移除空的目录结构
  for (const rel of EXCLUDED) {
    const dir = path.join(ROOT, path.dirname(rel));
    try {
      if (fs.readdirSync(dir).length === 0) {
        fs.rmdirSync(dir);
        // 也尝试移除父目录
        const parent = path.dirname(dir);
        if (fs.readdirSync(parent).length === 0) fs.rmdirSync(parent);
      }
    } catch {}
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
