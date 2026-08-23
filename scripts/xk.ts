/**
 * NJTECH 抢课 CLI
 *
 * 用法（Node 24 推荐 tsx 运行；ts-node 在 Node 24 上与原生类型剥离冲突）:
 *   npx -y tsx scripts/xk.ts search 高等数学 [--user 学号 --pass 密码]
 *   npx -y tsx scripts/xk.ts watch    [--user 学号 --pass 密码] [--interval 3000]
 *   npx -y tsx scripts/xk.ts grab     [--user 学号 --pass 密码] [--interval 3000]
 *   npx -y tsx scripts/xk.ts inspect  [--user 学号 --pass 密码]
 *
 * watch/grab 读取 scripts/xk.config.json（模板见 xk.config.example.json）:
 *   { "username": "...", "password": "...", "pollIntervalMs": 3000,
 *     "targets": [{ "courseName": "关键词", "teacher": "可选" }] }
 *
 * inspect 会把选课入口页与查询接口原始响应 dump 到 scripts/xk-inspect.json，
 * 选课轮次开放后用于校准接口路径与字段名。
 */

import fs from "fs";
import path from "path";

import {
  openXkSession,
  searchCourses,
  submitCourse,
  inspectXk,
  matchTargets,
  type XkSession,
  type XkTarget,
  type XkCourse,
} from "../lib/schools/njtech/xk";

// ── ANSI 颜色与响铃 ───────────────────────────────────────────

const RESET = "\x1b[0m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const BOLD = "\x1b[1m";

function beep(times = 3): void {
  process.stdout.write("\x07".repeat(times));
}

function ts(): string {
  return new Date().toLocaleTimeString("zh-CN", { hour12: false });
}

function log(msg: string): void {
  console.log(`[${ts()}] ${msg}`);
}

// ── 参数与配置 ────────────────────────────────────────────────

interface CliArgs {
  command: string;
  keyword?: string;
  user?: string;
  pass?: string;
  interval?: number;
}

function parseArgs(argv: string[]): CliArgs {
  const args = argv.slice(2);
  const command = args[0] || "help";
  let keyword: string | undefined;
  let user: string | undefined;
  let pass: string | undefined;
  let interval: number | undefined;

  for (let i = 1; i < args.length; i++) {
    if (args[i] === "--user") user = args[++i];
    else if (args[i] === "--pass") pass = args[++i];
    else if (args[i] === "--interval") interval = parseInt(args[++i], 10);
    else if (!keyword) keyword = args[i];
  }
  return { command, keyword, user, pass, interval };
}

interface XkConfig {
  username: string;
  password: string;
  pollIntervalMs?: number;
  targets: XkTarget[];
}

function loadConfig(): XkConfig {
  const file = path.join(__dirname, "xk.config.json");
  if (!fs.existsSync(file)) {
    console.error(
      `${RED}✗ 未找到 ${file}${RESET}\n  请复制 xk.config.example.json 为 xk.config.json 并填写配置`
    );
    process.exit(1);
  }
  const config = JSON.parse(fs.readFileSync(file, "utf-8")) as XkConfig;
  if (!config.username || !config.password) {
    console.error(`${RED}✗ 配置缺少 username/password${RESET}`);
    process.exit(1);
  }
  if (!Array.isArray(config.targets) || config.targets.length === 0) {
    console.error(`${RED}✗ 配置缺少 targets（目标课程列表）${RESET}`);
    process.exit(1);
  }
  return config;
}

/** 凭证优先级：CLI 参数 > 配置文件 */
function resolveCredentials(cli: CliArgs, config?: XkConfig): { username: string; password: string } {
  return {
    username: cli.user || config?.username || "",
    password: cli.pass || config?.password || "",
  };
}

// ── 会话管理（失效自动重登）─────────────────────────────────────

const MAX_RELOGIN = 5;

async function openSessionWithRetry(
  credentials: { username: string; password: string },
  onRelogin?: (attempt: number) => void
): Promise<XkSession> {
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= MAX_RELOGIN; attempt++) {
    try {
      const session = await openXkSession(credentials.username, credentials.password);
      if (attempt > 1 && onRelogin) onRelogin(attempt);
      if (!session.xkklcId) {
        log(`${YELLOW}⚠ 未解析到选课轮次 ID（选课可能未开放），查询可能为空${RESET}`);
      }
      return session;
    } catch (e) {
      lastError = e as Error;
      if (String((e as Error).message).includes("密码")) throw e; // 密码错误无需重试
      if (attempt < MAX_RELOGIN) {
        log(`${YELLOW}↻ 会话建立失败（${(e as Error).message}），${attempt * 2}s 后重试 [${attempt}/${MAX_RELOGIN}]${RESET}`);
        await sleep(attempt * 2000);
      }
    }
  }
  throw lastError || new Error("会话建立失败");
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** 轮询间隔 + 随机抖动（±20%），避免请求间隔被精确识别 */
function pollDelay(baseMs: number): Promise<void> {
  const jitter = baseMs * (0.8 + Math.random() * 0.4);
  return sleep(Math.round(jitter));
}

// ── 展示 ──────────────────────────────────────────────────────

function printCourses(courses: XkCourse[]): void {
  if (courses.length === 0) {
    console.log("  （无结果）");
    return;
  }
  console.log(
    `  ${"课程名".padEnd(24)}${"教师".padEnd(10)}${"学分".padEnd(6)}${"已选/容量".padEnd(12)}余量`
  );
  for (const c of courses) {
    const remainStr =
      c.remain > 0
        ? `${GREEN}${BOLD}${c.remain}${RESET}`
        : `${RED}${c.remain}${RESET}`;
    console.log(
      `  ${c.courseName.slice(0, 22).padEnd(24)}${c.teacher.slice(0, 8).padEnd(10)}${c.credit.padEnd(6)}${`${c.selected}/${c.capacity}`.padEnd(12)}${remainStr}`
    );
  }
}

// ── 子命令 ────────────────────────────────────────────────────

async function cmdSearch(cli: CliArgs): Promise<void> {
  if (!cli.keyword) {
    console.error("用法: scripts/xk.ts search <课程名关键词>");
    process.exit(1);
  }
  const credentials = resolveCredentials(cli);
  if (!credentials.username || !credentials.password) {
    console.error("缺少凭证：请用 --user/--pass 或配置 xk.config.json");
    process.exit(1);
  }

  log(`${CYAN}登录教务系统...${RESET}`);
  const session = await openSessionWithRetry(credentials);
  log(`登录成功（选课轮次 ID: ${session.xkklcId || "未解析到"}）`);

  log(`搜索「${cli.keyword}」...`);
  const courses = await searchCourses(session, cli.keyword);
  printCourses(courses);
}

async function pollOnce(
  session: XkSession,
  targets: XkTarget[]
): Promise<{ expired: boolean; available: XkCourse[]; all: XkCourse[] }> {
  try {
    const all = await searchCourses(session);
    const available = all.filter(
      (c) => c.remain > 0 && matchTargets(c, targets)
    );
    return { expired: false, available, all };
  } catch (e) {
    if ((e as Error).message === "SESSION_EXPIRED") {
      return { expired: true, available: [], all: [] };
    }
    throw e;
  }
}

async function cmdWatch(cli: CliArgs): Promise<void> {
  const config = loadConfig();
  const credentials = resolveCredentials(cli, config);
  const interval = cli.interval || config.pollIntervalMs || 3000;
  const targets = config.targets;

  log(`监控 ${targets.length} 个目标，间隔 ${interval}ms（含 ±20% 抖动）`);
  log(`目标: ${targets.map((t) => t.courseName + (t.teacher ? `(${t.teacher})` : "")).join("、")}`);

  let session = await openSessionWithRetry(credentials);
  let round = 0;

  for (;;) {
    round++;
    const { expired, available, all } = await pollOnce(session, targets);

    if (expired) {
      log(`${YELLOW}↻ 会话失效，自动重登...${RESET}`);
      session = await openSessionWithRetry(credentials);
      continue;
    }

    const matched = all.filter((c) => matchTargets(c, targets));
    const summary = matched
      .map((c) => `${c.courseName} ${c.selected}/${c.capacity}`)
      .join(" | ");
    log(
      `第 ${round} 轮: ${matched.length} 个教学班命中目标${summary ? `（${summary}）` : ""}`
    );

    if (available.length > 0) {
      beep(5);
      console.log("");
      log(`${GREEN}${BOLD}★ 发现余量！${RESET}`);
      printCourses(available);
      console.log("");
    }

    await pollDelay(interval);
  }
}

async function cmdGrab(cli: CliArgs): Promise<void> {
  const config = loadConfig();
  const credentials = resolveCredentials(cli, config);
  const interval = cli.interval || config.pollIntervalMs || 3000;
  const targets = config.targets;

  log(`${BOLD}【抢课模式】${RESET}监控 ${targets.length} 个目标，间隔 ${interval}ms（含抖动）`);
  log(`目标: ${targets.map((t) => t.courseName + (t.teacher ? `(${t.teacher})` : "")).join("、")}`);

  let session = await openSessionWithRetry(credentials);
  let round = 0;
  let submitAttempts = 0;

  for (;;) {
    round++;
    const { expired, available } = await pollOnce(session, targets);

    if (expired) {
      log(`${YELLOW}↻ 会话失效，自动重登...${RESET}`);
      session = await openSessionWithRetry(credentials);
      continue;
    }

    if (available.length === 0) {
      if (round % 10 === 0) {
        log(`第 ${round} 轮: 暂无余量，继续监控...`);
      }
      await pollDelay(interval);
      continue;
    }

    // 有余量，逐个提交
    for (const course of available) {
      submitAttempts++;
      log(`${CYAN}⚡ 提交选课: ${course.courseName}（${course.teacher}）余量 ${course.remain}${RESET}`);
      const result = await submitCourse(session, course);

      if (result.ok) {
        beep(10);
        log(`${GREEN}${BOLD}✓ 抢课成功: ${course.courseName}（${course.teacher}）${RESET}`);
        process.exit(0);
      }

      log(`${RED}✗ 提交失败: ${result.message}${RESET}`);
      if (result.message === "SESSION_EXPIRED") {
        session = await openSessionWithRetry(credentials);
        break; // 重登后重新轮询
      }
      if (submitAttempts >= 10) {
        log(`${RED}提交失败次数过多（${submitAttempts}），退出。请检查接口是否需要校准${RESET}`);
        process.exit(1);
      }
    }

    await pollDelay(interval);
  }
}

async function cmdInspect(cli: CliArgs): Promise<void> {
  const credentials = resolveCredentials(cli);
  if (!credentials.username || !credentials.password) {
    console.error("缺少凭证：请用 --user/--pass 或配置 xk.config.json");
    process.exit(1);
  }

  log(`${CYAN}登录并探测选课接口...${RESET}`);
  const result = await inspectXk(credentials.username, credentials.password);

  const outFile = path.join(__dirname, "xk-inspect.json");
  fs.writeFileSync(
    outFile,
    JSON.stringify(
      {
        capturedAt: new Date().toISOString(),
        xkklcId: result.xkklcId,
        courseListRaw: result.courseListRaw,
        entryHtmlHead: result.entryHtml.slice(0, 2000),
      },
      null,
      2
    ),
    "utf-8"
  );

  log(`选课轮次 ID: ${result.xkklcId || "未解析到（选课可能未开放）"}`);
  log(`课程查询响应前 200 字符: ${result.courseListRaw.slice(0, 200) || "（空）"}`);
  log(`${GREEN}✓ 原始响应已写入 ${outFile}${RESET}`);
}

function cmdHelp(): void {
  console.log(`
NJTECH 抢课 CLI

用法:
  search <关键词>   搜索课程并显示余量
  watch             轮询监控目标课程，有余量时响铃提醒
  grab              轮询监控目标课程，有余量时自动提交选课
  inspect           dump 选课接口原始响应到 xk-inspect.json（用于字段校准）

选项:
  --user <学号>        凭证（优先于配置文件）
  --pass <密码>
  --interval <毫秒>    轮询间隔（默认 3000）

配置:
  watch/grab 读取 scripts/xk.config.json（含凭证与目标课程）
`);
}

// ── 入口 ──────────────────────────────────────────────────────

async function main(): Promise<void> {
  const cli = parseArgs(process.argv);

  try {
    switch (cli.command) {
      case "search":
        await cmdSearch(cli);
        break;
      case "watch":
        await cmdWatch(cli);
        break;
      case "grab":
        await cmdGrab(cli);
        break;
      case "inspect":
        await cmdInspect(cli);
        break;
      default:
        cmdHelp();
    }
  } catch (e) {
    console.error(`${RED}✗ ${(e as Error).message}${RESET}`);
    process.exit(1);
  }
}

void main();
