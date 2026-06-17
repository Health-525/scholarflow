/**
 * 切换 better-sqlite3 原生模块的 ABI 目标。
 *
 * better-sqlite3 是 C++ 原生模块,其 .node 二进制只能被 ABI 匹配的运行时加载:
 *   - 热更新开发态:server 由 `next dev` 跑在系统 Node 下  → 需要 "node" ABI
 *   - 打包产物:standalone server 由 Electron 二进制运行    → 需要 "electron" ABI
 *
 * 用法:
 *   node scripts/switch-abi.js node       # 切到系统 Node ABI(开发/热更新前)
 *   node scripts/switch-abi.js electron   # 切到 Electron ABI(打包时,postbuild 调用)
 *
 * 通过 prebuild-install 拉取对应预编译二进制,无需本地 C++ 编译器。
 */
const path = require("path");
const { execFileSync } = require("child_process");

const target = (process.argv[2] || "node").toLowerCase();
const bsqDir = path.join(__dirname, "..", "node_modules", "better-sqlite3");
const npx = process.platform === "win32" ? "npx.cmd" : "npx";

function getElectronVersion() {
  try {
    return require(path.join(__dirname, "..", "node_modules", "electron", "package.json")).version;
  } catch {
    return null;
  }
}

let args;
if (target === "electron") {
  const v = getElectronVersion();
  if (!v) {
    console.error("[switch-abi] 无法确定 Electron 版本,跳过");
    process.exit(0); // 不阻断打包链
  }
  args = ["--yes", "prebuild-install", "-r", "electron", "-t", v];
  console.log(`[switch-abi] better-sqlite3 → Electron ${v} ABI`);
} else {
  args = ["--yes", "prebuild-install", "-r", "node"];
  console.log("[switch-abi] better-sqlite3 → 系统 Node ABI");
}

try {
  execFileSync(npx, args, { cwd: bsqDir, stdio: "inherit", shell: true });
  console.log("[switch-abi] 完成");
} catch (e) {
  console.error("[switch-abi] WARNING: prebuild-install 失败:", e.message);
  // 不以非零退出,避免打断 && 链;若二进制不匹配,运行时日志会给出 ABI 诊断
  process.exit(0);
}
