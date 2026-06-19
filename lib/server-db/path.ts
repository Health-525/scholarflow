import os from "os";
import path from "path";

/** 打包产物路径标志段:出现这些段即认为路径位于打包产物内部 */
const PACKAGED_PATH_MARKERS = ["app.asar", ".next", "standalone", "dist"];

/**
 * 判断目录是否位于打包产物内部。
 * 归一化反斜杠为正斜杠后,判断是否包含任一标志段(形如 `/marker/` 或以 `/marker` 结尾)。
 */
export function isInsidePackagedDir(dir: string): boolean {
  const n = dir.replace(/\\/g, "/");
  return PACKAGED_PATH_MARKERS.some((m) => n.includes(`/${m}/`) || n.endsWith(`/${m}`));
}

/**
 * 基于用户主目录的稳定回退锚点(跨平台)。
 * 有非空 `%APPDATA%` 时返回 `%APPDATA%\ScholarFlow\data`,否则 `os.homedir()/.scholarflow/data`。
 */
export function homeAnchoredFallback(): string {
  const appData = process.env.APPDATA; // Windows: %APPDATA%\ScholarFlow\data
  if (appData && appData.trim()) {
    return path.join(appData, "ScholarFlow", "data");
  }
  return path.join(os.homedir(), ".scholarflow", "data"); // 其他平台
}

/**
 * 解析数据目录(供测试与复用的纯路径解析)。
 *   1. `SCHOLARFLOW_DATA_DIR` 非空(trim)→ 直接用
 *   2. 否则 cwd 不在打包目录 → `cwd/data`
 *   3. 否则(打包态且无 env)→ home 锚定回退,绝不写打包目录
 */
export function resolveDataDir(
  env: NodeJS.ProcessEnv = process.env,
  cwd: string = process.cwd()
): string {
  const explicit = env.SCHOLARFLOW_DATA_DIR;
  if (explicit && explicit.trim()) {
    return explicit;
  }
  const cwdData = path.join(cwd, "data");
  if (!isInsidePackagedDir(cwd)) {
    return cwdData;
  }
  return homeAnchoredFallback();
}
