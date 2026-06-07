import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

// 复用 local-data 的时间表目录探测
function findTimetableDir(): string {
  const envDir = process.env.TIMETABLE_DIR;
  if (envDir) try { if (fs.existsSync(path.join(envDir, "data"))) return envDir; } catch {}
  const candidates = [
    path.join(process.cwd(), "..", "timetable"),
    path.join(process.cwd(), "..", "..", "timetable"),
    path.join(process.cwd(), "..", "..", "..", "timetable"),
  ];
  for (const c of candidates) {
    try { if (fs.existsSync(path.join(c, "data"))) return c; } catch {}
  }
  throw new Error("Cannot find timetable directory");
}

/**
 * 自动 git commit 数据变更
 * - 如果是 git 仓库且有变更，自动 stage + commit
 * - commit message 包含文件名和操作描述
 * - 如果没有变更或不是 git 仓库，静默跳过
 * - 5秒超时防止阻塞
 */
function autoGitCommit(dir: string, filePath: string, action: string) {
  try {
    // 检查是否是 git 仓库
    const gitDir = path.join(dir, ".git");
    if (!fs.existsSync(gitDir)) return;

    // 检查是否有变更
    const status = execSync("git status --porcelain -- " + JSON.stringify(filePath), {
      cwd: dir, timeout: 3000, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    if (!status) return; // 无变更

    // stage + commit
    execSync(`git add -- ${JSON.stringify(filePath)}`, {
      cwd: dir, timeout: 3000, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"],
    });

    // 生成简要 commit message
    const fileName = path.basename(filePath);
    const dirName = path.dirname(filePath).split(path.sep).pop() || "";
    const label = dirName ? `${dirName}/${fileName}` : fileName;
    execSync(`git commit -m "${action}: ${label}" --no-verify`, {
      cwd: dir, timeout: 5000, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"],
    });
  } catch {
    // git 操作失败不影响主流程（可能无用户配置、detached HEAD 等）
  }
}

/**
 * 获取最近的 git 提交历史（仅 data/ 目录）
 */
function getGitHistory(dir: string): string {
  try {
    const gitDir = path.join(dir, ".git");
    if (!fs.existsSync(gitDir)) return "非 Git 仓库";

    const log = execSync(
      'git log --oneline -10 -- "data/*"',
      { cwd: dir, timeout: 3000, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }
    ).trim();

    if (!log) return "暂无数据变更记录";
    return log;
  } catch {
    return "获取历史失败";
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { file?: string; content?: string; action?: string };
    const { file, content, action } = body;

    // 特殊操作：查看版本历史
    if (action === "view-history" && !file) {
      const td = findTimetableDir();
      const history = getGitHistory(td);
      return NextResponse.json({ ok: true, history });
    }

    if (!file || !content) return NextResponse.json({ error: "missing file/content" }, { status: 400 });

    const td = findTimetableDir();
    const filePath = path.join(td, file);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, "utf8");

    // 自动 git commit
    autoGitCommit(td, file, action || "更新");

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
