# ScholarFlow 独立化改造 Spec

> 版本: 1.0 · 日期: 2026-06-15 · 作者: DeepV Code

---

## 1. 项目背景与目标

### 1.1 当前问题

ScholarFlow 当前依赖两个外部仓库：

| 依赖仓库 | 依赖方式 | 问题 |
|-----------|----------|------|
| `Health-525/timetable` | `/api/local-data` 读 `timetable/data/*.json` 文件；`/api/local-save` 写文件 + git commit；GitHub 同步导入/导出 | 无法部署到远程服务器（服务器上没有 timetable 目录）；每次写入是一次 git commit（慢）；用户必须提供 GitHub PAT |
| `Health-525/jiangshu-study` | GitHub 同步读取笔记/日报/周报；`repos.ts` 硬编码仓库路径 | 同上；数据存储在公开仓库（隐私问题） |

**核心痛点：**
- GitHub Contents API 当数据库 — 每次写入是 git commit，速率限制 5000次/小时，延迟高
- 用户必须提供 GitHub PAT — 对非技术用户是巨大障碍
- 无法部署到远程服务器 — `local-data/route.ts` 用 `fs.readFileSync` 读本地文件系统
- 数据隐私 — 课表、作业、跑步数据存在公开 GitHub 仓库

### 1.2 改造目标

**最终状态：** ScholarFlow 是一个完全自给自足的单仓库应用，不再依赖任何外部仓库。

| 目标 | 达标判据 |
|------|---------|
| 数据存储独立 | ScholarFlow 用 SQLite 存储所有数据，不再读/写 timetable 目录的文件 |
| 数据获取独立 | ScholarFlow 内置学校适配器，能自动从教务系统抓取课表/成绩/考试等数据 |
| 认证独立 | 登录流程为"选择学校 + 输入学校凭证"，不再要求 GitHub PAT |
| 可部署 | 能部署到任意服务器（Vercel/VPS/云主机），无需本地 timetable 目录 |
| 可扩展 | 新增学校只需添加一个 adapter 文件，不改核心逻辑 |

---

## 2. 架构设计

### 2.1 总体架构

```
┌──────────────────────────────────────────────────────┐
│                  ScholarFlow (Next.js + Electron)    │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌────────────────────┐ │
│  │ Dashboard │  │ Schedule │  │ Assignments        │ │
│  └──────────┘  └──────────┘  └────────────────────┘ │
│  ... (其他页面不变)                                    │
│                                                      │
│  ═══════════════ Data Layer ═══════════════         │
│  ┌─────────────────────────────────────────────┐    │
│  │ TanStack Query v5  (SWR, dedup, cache)      │    │
│  │  ↕                                          │    │
│  │ /api/local-data  /api/local-save            │    │
│  │  ↕                                          │    │
│  │ SQLite (better-sqlite3) ← 新！替代 GitHub   │    │
│  └─────────────────────────────────────────────┘    │
│                                                      │
│  ═══════════════ School Adapters ═══════════════    │
│  ┌─────────────────────────────────────────────┐    │
│  │ SchoolAdapter interface                     │    │
│  │  ├─ NJTECH adapter (教务系统+图书馆+通知)    │    │
│  │  ├─ (未来) 其他学校 adapter                  │    │
│  └─────────────────────────────────────────────┘    │
│                                                      │
│  ═══════════════ Auth ═══════════════               │
│  ┌─────────────────────────────────────────────┐    │
│  │ 选择学校 → 输入凭证 → adapter.login()       │    │
│  │ → session JWT → Zustand store               │    │
│  └─────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────┘
```

### 2.2 SchoolAdapter 接口

```ts
// lib/schools/types.ts

export interface SchoolAdapter {
  /** 学校唯一标识 */
  id: string;           // e.g. "njtech"
  /** 学校显示名称 */
  name: string;         // e.g. "南京工业大学"
  /** 登录页需要的输入字段 */
  loginFields: LoginField[];
  /** 登录验证 — 返回凭证对象（后续 fetch 方法使用） */
  login(credentials: Record<string, string>): Promise<SchoolCredentials>;
  /** 抓取课表 */
  fetchSchedule(credentials: SchoolCredentials): Promise<Course[]>;
  /** 抓取考试安排 */
  fetchExams(credentials: SchoolCredentials): Promise<Exam[]>;
  /** 抓取成绩 + GPA */
  fetchGrades(credentials: SchoolCredentials): Promise<GradeResult>;
  /** 抓取图书馆座位（可选 — 有些学校没有） */
  fetchLibrary?(credentials: SchoolCredentials): Promise<LibraryData>;
  /** 抓取教务通知（可选） */
  fetchJwcNews?(): Promise<NewsItem[]>;
}

export interface LoginField {
  key: string;          // e.g. "username", "password"
  label: string;        // e.g. "学号", "教务系统密码"
  type: "text" | "password";
  placeholder?: string;
  required: boolean;
}

export interface SchoolCredentials {
  schoolId: string;
  /** 适配器自定义的凭证数据（加密存储） */
  data: Record<string, string>;
  /** 凭证过期时间（可选） */
  expiresAt?: number;
}
```

### 2.3 学校注册表

```ts
// lib/schools/registry.ts

import { SchoolAdapter } from "./types";
import { njtechAdapter } from "./njtech";

const ADAPTERS: Map<string, SchoolAdapter> = new Map();

export function registerSchool(adapter: SchoolAdapter) {
  ADAPTERS.set(adapter.id, adapter);
}

export function getAdapter(schoolId: string): SchoolAdapter | undefined {
  return ADAPTERS.get(schoolId);
}

export function getAllSchools(): SchoolAdapter[] {
  return [...ADAPTERS.values()];
}

// 注册已知学校
registerSchool(njtechAdapter);
```

### 2.4 SQLite 数据层

```ts
// lib/server-db.ts

import Database from "better-sqlite3";
import path from "path";

// 数据存储表 — key-value 模式，兼容现有 JSON 数据格式
// 这样前端解析逻辑完全不变
const SCHEMA = `
  CREATE TABLE IF NOT EXISTS data_store (
    key TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS credentials (
    school_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    credential_data TEXT NOT NULL,
    expires_at INTEGER,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (school_id, user_id)
  );
`;

export class ServerDB {
  private db: Database.Database;

  constructor(dbPath?: string) {
    const resolvedPath = dbPath || path.join(process.cwd(), "data", "scholarflow.db");
    this.db = new Database(resolvedPath);
    this.db.exec(SCHEMA);
    this.db.pragma("journal_mode = WAL");
  }

  // ── 数据读写（替代 timetable 文件系统） ──

  readData(key: string): unknown | null {
    const row = this.db.prepare("SELECT content FROM data_store WHERE key = ?").get(key);
    if (!row) return null;
    try { return JSON.parse(row.content as string); } catch { return null; }
  }

  writeData(key: string, content: unknown): void {
    const json = typeof content === "string" ? content : JSON.stringify(content, null, 2);
    this.db.prepare(
      "INSERT OR REPLACE INTO data_store (key, content, updated_at) VALUES (?, ?, ?)"
    ).run(key, json, Date.now());
  }

  // ── 凭证存储（替代 GitHub PAT） ──

  saveCredentials(schoolId: string, userId: string, data: Record<string, string>, expiresAt?: number): void {
    this.db.prepare(
      "INSERT OR REPLACE INTO credentials (school_id, user_id, credential_data, expires_at, created_at) VALUES (?, ?, ?, ?, ?)"
    ).run(schoolId, userId, JSON.stringify(data), expiresAt || null, Date.now());
  }

  getCredentials(schoolId: string, userId: string): Record<string, string> | null {
    const row = this.db.prepare("SELECT credential_data, expires_at FROM credentials WHERE school_id = ? AND user_id = ?").get(schoolId, userId);
    if (!row) return null;
    if (row.expires_at && Date.now() > row.expires_at) return null; // 已过期
    try { return JSON.parse(row.credential_data as string); } catch { return null; }
  }
}
```

### 2.5 登录流程

```
用户打开 ScholarFlow
  → /setup 页面
  → Step 1: 选择学校（下拉列表，当前只有"南京工业大学"）
  → Step 2: 输入该学校要求的凭证
      NJTECH: 学号 + 教务系统密码
  → Step 3: 点击"登录"
      → adapter.login(credentials) 验证
      → 成功: 保存凭证到 SQLite + Zustand store
      → 失败: 显示错误信息
  → 登录成功后自动触发数据抓取
      → adapter.fetchSchedule() → 写入 SQLite → 前端刷新
      → adapter.fetchExams() → 写入 SQLite
      → adapter.fetchGrades() → 写入 SQLite
      → adapter.fetchJwcNews() → 写入 SQLite
  → 跳转到 Dashboard
```

---

## 3. 数据层改造

### 3.1 `/api/local-data/route.ts` 改造

**当前：** 用 `fs.readFileSync` 读 `timetable/data/*.json` 和 `timetable/_out/*.json`

**改造后：** 从 SQLite `data_store` 表读取

```ts
// 改造后的 app/api/local-data/route.ts
import { NextResponse } from "next/server";
import { getServerDB } from "@/lib/server-db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "dashboard";
  const db = getServerDB();

  switch (type) {
    case "dashboard": {
      // 从 SQLite 读 dashboard summary，如果没有则动态生成
      let summary = db.readData("dashboard-summary");
      if (!summary) {
        const schedule = db.readData("schedule") || { courses: [] };
        const assignments = db.readData("assignments") || [];
        // ... 动态生成逻辑（同现有代码）
        summary = generateDashboardSummary(schedule, assignments, ...);
        db.writeData("dashboard-summary", summary);
      }
      return NextResponse.json(summary);
    }
    case "schedule":
      return NextResponse.json(db.readData("schedule") || { courses: [] });
    case "assignments":
      return NextResponse.json(db.readData("assignments") || []);
    case "running":
      return NextResponse.json(db.readData("running") || { records: [] });
    case "health":
      return NextResponse.json(db.readData("health-status") || { agents: [] });
    case "exams":
      return NextResponse.json(db.readData("exams") || []);
    case "grades":
      return NextResponse.json(db.readData("grades") || { gpa: 0, allCourses: [] });
    case "library":
      return NextResponse.json(db.readData("library") || { libs: [], summary: {} });
    case "student":
      return NextResponse.json(db.readData("student") || {});
    case "jwc-news":
      return NextResponse.json(db.readData("jwc-news") || []);
    default:
      return NextResponse.json({ error: "unknown type" }, { status: 400 });
  }
}
```

**关键变化：**
- 删除 `findTimetableDir()` 函数
- 删除所有 `fs.readFileSync` / `fs.existsSync` 调用
- 删除 `TIMETABLE_DIR` 环境变量依赖
- 数据来源从文件系统改为 SQLite

### 3.2 `/api/local-save/route.ts` 改造

**当前：** 用 `fs.writeFileSync` 写文件 + `execSync("git commit")`

**改造后：** 写入 SQLite `data_store` 表

```ts
// 改造后的 app/api/local-save/route.ts
import { NextResponse } from "next/server";
import { getServerDB } from "@/lib/server-db";

export async function POST(request: Request) {
  const body = await request.json() as { file?: string; content?: string; action?: string };
  const { file, content, action } = body;

  if (!file || !content) {
    return NextResponse.json({ error: "missing file/content" }, { status: 400 });
  }

  // 从文件路径提取 key: "data/schedule.json" → "schedule"
  const key = file.replace(/^data\//, "").replace(/\.json$/, "");

  const db = getServerDB();
  db.writeData(key, content);

  return NextResponse.json({ ok: true });
}
```

**关键变化：**
- 删除 `findTimetableDir()` 函数
- 删除 `fs.writeFileSync` 调用
- 删除 `autoGitCommit()` 函数（不再需要 git commit）
- 删除 `getGitHistory()` 函数
- 删除 `execSync` 调用

### 3.3 新增 `/api/fetch/*` 数据抓取 API routes

这些 API route 调用学校适配器抓取数据，然后写入 SQLite：

| API Route | 调用 | 写入 SQLite key |
|-----------|------|----------------|
| `/api/fetch/schedule` | `adapter.fetchSchedule()` | `schedule` |
| `/api/fetch/exams` | `adapter.fetchExams()` | `exams` |
| `/api/fetch/grades` | `adapter.fetchGrades()` | `grades` |
| `/api/fetch/library` | `adapter.fetchLibrary()` | `library` |
| `/api/fetch/jwc-news` | `adapter.fetchJwcNews()` | `jwc-news` |
| `/api/fetch/all` | 调用以上所有 | 所有 key |

```ts
// app/api/fetch/schedule/route.ts 示例
import { NextResponse } from "next/server";
import { getAdapter } from "@/lib/schools/registry";
import { getServerDB } from "@/lib/server-db";
import { getCredentialsFromSession } from "@/lib/session";

export async function POST() {
  const { schoolId, credentials } = await getCredentialsFromSession();
  const adapter = getAdapter(schoolId);
  if (!adapter) return NextResponse.json({ error: "unknown school" }, { status: 400 });

  try {
    const courses = await adapter.fetchSchedule(credentials);
    const db = getServerDB();
    db.writeData("schedule", { courses });
    return NextResponse.json({ ok: true, count: courses.length });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
```

---

## 4. 学校适配器实现 — NJTECH

### 4.1 文件结构

```
lib/schools/
  types.ts            ← SchoolAdapter 接口（见 2.2）
  registry.ts         ← 学校注册表（见 2.3）
  njtech/
    index.ts          ← NJTECH adapter 主文件（implements SchoolAdapter）
    jwgl.ts           ← 教务系统登录+课表/考试/成绩抓取
    jwgl-crypto.ts    ← 正方教务 RSA 加密（搬自 timetable/scripts/lib/zf-crypto.js）
    jwgl-http.ts      ← HTTP 客户端+Cookie 管理（搬自 timetable/scripts/lib/jwgl-http.js）
    library.ts        ← 图书馆 GraphQL（搬自 timetable/scripts/fetch_library.js）
    jwc-news.ts       ← 教务处通知爬虫（搬自 timetable/scripts/fetch_jwc_news.js）
    grades.ts         ← 全部成绩+GPA 计算（搬自 timetable/scripts/fetch_grades_all.js）
```

### 4.2 NJTECH Adapter 主文件

```ts
// lib/schools/njtech/index.ts

import { SchoolAdapter, LoginField, SchoolCredentials } from "../types";
import { loginJwgl, fetchSchedule, fetchExams, fetchCurrentGrades } from "./jwgl";
import { fetchAllGrades, calculateGPA, GradeResult } from "./grades";
import { fetchLibrarySeats, LibraryData } from "./library";
import { fetchJwcNews, NewsItem } from "./jwc-news";

export const njtechAdapter: SchoolAdapter = {
  id: "njtech",
  name: "南京工业大学",
  loginFields: [
    { key: "username", label: "学号", type: "text", placeholder: "如 202321144057", required: true },
    { key: "password", label: "教务系统密码", type: "password", required: true },
  ],

  async login(credentials): Promise<SchoolCredentials> {
    // 登录教务系统验证凭证
    const { username, password } = credentials;
    const session = await loginJwgl(username, password);
    // session 包含 cookie 等信息，后续 fetch 方法使用
    return {
      schoolId: "njtech",
      data: {
        username,
        cookie: session.cookie,
        // 注意: cookie 会过期，需要定期刷新
      },
      expiresAt: Date.now() + 30 * 60 * 1000, // 30 分钟过期
    };
  },

  async fetchSchedule(credentials) {
    return fetchSchedule(credentials.data.cookie);
  },

  async fetchExams(credentials) {
    return fetchExams(credentials.data.cookie);
  },

  async fetchGrades(credentials) {
    return fetchAllGrades(credentials.data.cookie, credentials.data.username);
  },

  async fetchLibrary(credentials) {
    // 图书馆需要单独的 JWT，从 credentials.data.libraryJwt 获取
    // 如果没有 libraryJwt，返回 null（图书馆功能可选）
    if (!credentials.data.libraryJwt) return null;
    return fetchLibrarySeats(credentials.data.libraryJwt);
  },

  async fetchJwcNews() {
    return fetchJwcNews();
  },
};
```

### 4.3 脚本迁移清单

| timetable 源文件 | ScholarFlow 目标文件 | 改动要点 |
|-----------------|---------------------|---------|
| `scripts/fetch_jwgl.js` | `lib/schools/njtech/jwgl.ts` | 改为 TypeScript；函数化（不再是一次性脚本）；返回数据而非写文件；Cookie 从参数传入而非全局变量 |
| `scripts/lib/zf-crypto.js` | `lib/schools/njtech/jwgl-crypto.ts` | 直接搬，加 TypeScript 类型声明 |
| `scripts/lib/jwgl-http.js` | `lib/schools/njtech/jwgl-http.ts` | 改为 TypeScript；返回类型化结果；Cookie 管理改为实例方法 |
| `scripts/fetch_library.js` | `lib/schools/njtech/library.ts` | 改为 TypeScript；JWT 从参数传入；返回类型化数据 |
| `scripts/fetch_jwc_news.js` | `lib/schools/njtech/jwc-news.ts` | 改为 TypeScript；返回类型化数据 |
| `scripts/fetch_grades_all.js` | `lib/schools/njtech/grades.ts` | 改为 TypeScript；GPA 计算逻辑保留；返回 GradeResult 类型 |
| `scripts/lib/week-utils.js` | `lib/schedule/week-utils.ts` | 已有类似逻辑在 `lib/schedule/schedule.ts`，合并或保留 |
| `scripts/lib/load-env.js` | **删除** | 不再需要，凭证从登录页获取 |
| `scripts/lib/llm.js` | `lib/llm.ts` | LLM 调用模块（日报/周报生成需要），独立搬入 |
| `scripts/lib/agent-comm.js` | **暂不搬** | Agent 通信模块，后续按需搬入 |

### 4.4 NJTECH 教务系统抓取逻辑要点

**登录流程（搬自 fetch_jwgl.js）：**
1. GET `/xtgl/login_slogin.html` → 提取 CSRF token
2. GET `/xtgl/login_getPublicKey.html` → 获取 RSA 公钥（modulus + exponent）
3. 用 `encryptPassword()` RSA 加密密码
4. POST 登录表单（csrftoken + username + encrypted_password）
5. 管理 Cookie（set-cookie 自动收集）

**课表抓取：**
- POST `/kbcx/xskbcx_cxXsKb.html` with `xnm`（学年）+ `xqm`（学期）
- 返回 JSON，解析为 Course[]

**考试抓取：**
- POST `/kwgl/kscx_cxXsksxxIndex.html` with `xnm` + `xqm`
- 返回 JSON，解析为 Exam[]

**成绩抓取：**
- POST `/cjcx/cjcx_cxDgXscj.html` with `xnm` + `xqm`
- 循环遍历所有学年学期
- 去重取最高分
- GPA 计算：只计必修课，南工大绩点规则（90→4.0, 86→3.7, ...）

**图书馆（搬自 fetch_library.js）：**
- GraphQL API: `seat.njtech.edu.cn/index.php/graphql/`
- 认证: Cookie `Authorization=<JWT>`
- 查询: `{userAuth{reserve{libs{...}}}}`
- JWT 需要用户手动从浏览器获取（图书馆系统不与教务系统共享认证）

**教务处通知（搬自 fetch_jwc_news.js）：**
- 爬取 `jwc.njtech.edu.cn` 三个页面
- 解析 HTML 提取通知列表
- 无需认证（公开页面）

---

## 5. 登录/Setup 页面改造

### 5.1 当前 Setup 页面

**当前：** 要求输入 GitHub PAT（`ghp_` 或 `github_pat_` 开头）

**改造后：** 三步式登录流程

```
Step 1: 选择学校
  ┌─────────────────────────────┐
  │  📚 ScholarFlow             │
  │                             │
  │  选择你的学校               │
  │  ┌─────────────────────┐   │
  │  │ 南京工业大学        ▼│   │
  │  └─────────────────────┘   │
  │                             │
  │  [下一步]                   │
  └─────────────────────────────┘

Step 2: 输入凭证（根据学校动态渲染）
  ┌─────────────────────────────┐
  │  📚 南京工业大学            │
  │                             │
  │  学号                       │
  │  ┌─────────────────────┐   │
  │  │ 202321144057         │   │
  │  └─────────────────────┘   │
  │                             │
  │  教务系统密码               │
  │  ┌─────────────────────┐   │
  │  │ ••••••••             │   │
  │  └─────────────────────┘   │
  │                             │
  │  [登录]                     │
  └─────────────────────────────┘

Step 3: 数据加载（自动抓取）
  ┌─────────────────────────────┐
  │  ✅ 登录成功！              │
  │                             │
  │  正在加载你的数据...        │
  │  ✅ 课表 (12门课程)         │
  │  ✅ 考试安排 (3门)          │
  │  ✅ 成绩 (GPA 3.73)        │
  │  ⏳ 教务通知...             │
  │                             │
  │  [进入 ScholarFlow]         │
  └─────────────────────────────┘
```

### 5.2 Setup 页面代码结构

```ts
// app/setup/page.tsx 改造后

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAllSchools, getAdapter } from "@/lib/schools/registry";
import { useAuthStore } from "@/store/auth";

type Step = "select-school" | "enter-credentials" | "loading-data";

export default function SetupPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const schools = getAllSchools();

  const [step, setStep] = useState<Step>("select-school");
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>("");
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [loadingStatus, setLoadingStatus] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  // Step 1: 选择学校
  // Step 2: 输入凭证（根据 adapter.loginFields 动态渲染表单）
  // Step 3: 登录 + 数据抓取
  //   - adapter.login(credentials) → 保存凭证
  //   - 依次调用 adapter.fetch*() → 写入 SQLite
  //   - 完成后跳转 Dashboard
}
```

### 5.3 图书馆 JWT（可选配置）

NJTECH 图书馆系统使用独立的 JWT 认证，不与教务系统共享。在 Setup Step 2 中，如果学校 adapter 有 `fetchLibrary` 方法，额外显示一个可选字段：

```
  图书馆 JWT（可选 — 用于查看座位信息）
  ┌─────────────────────┐
  │ 从浏览器登录图书馆后提取 │
  └─────────────────────┘
```

---

## 6. 前端改动清单

### 6.1 hooks/useQueries.ts

**改动：**
- 删除 `import { useGitHubClient } from "./useGitHubClient"`
- 删除 `import type { GitHubError } from "@/lib/github/errors"`
- 删除 `useSyncFromGitHub()` 函数（约 80 行）
- 删除 `useSyncToGitHub()` 函数（约 30 行）
- 删除 `SyncResult` / `PushResult` 类型
- 删除所有合并策略函数（`mergeAssignments`, `mergeRunRecords` 等 — 不再需要 GitHub 合并）
- 将 `GitHubError` 类型替换为通用 `Error`
- `saveLocally()` 中的 `getDB().cacheFile()` 调用 — 去掉 `repo` 和 `sha` 参数（见 6.4）

**保留不变：**
- `queryKeys` 工厂
- `useScheduleQuery()`
- `useAssignmentsQuery()`（add/markDone/undo/reorder mutations）
- `useRunningQuery()`
- `useJwcNewsQuery()`
- 所有本地数据读写逻辑（`tryLocalApi`, `saveLocally`）

### 6.2 store/auth.ts

**当前：** 存储 GitHub PAT token

**改造后：** 存储学校认证信息

```ts
// store/auth.ts 改造后

interface AuthState {
  schoolId: string | null;       // "njtech"
  isAuthenticated: boolean;
  credentials: Record<string, string> | null;  // 学校凭证（加密存储在服务端）
  setAuth: (schoolId: string, credentials: Record<string, string>) => void;
  clearAuth: () => void;
}
```

**注意：** 凭证的敏感部分（密码、cookie）存储在服务端 SQLite `credentials` 表中，前端只存 `schoolId` 和一个 session token。前端 Zustand store 不再存 GitHub PAT。

### 6.3 app/ClientShell.tsx

**改动：**
- 删除 `secureRetrieveToken()` / `migrateLegacyToken()` 调用
- 删除 `process.env.NEXT_PUBLIC_GH_TOKEN` fallback
- 删除 `"local-mode"` token fallback
- 改为检查 `schoolId` 是否存在（从 Zustand persist 恢复）
- 未认证时跳转 `/setup`（逻辑不变，只是判据从 token 改为 schoolId）

### 6.4 lib/db/index.ts (Dexie IndexedDB)

**改动：**
- `CachedFile` 表去掉 `repo` 和 `sha` 字段（不再来自 GitHub）
- 改为简单的 `key` + `content` + `updatedAt` 结构
- `MutationsQueue` 表去掉 `repo` 字段
- `cacheFile()` 方法签名改为 `cacheFile(key: string, content: string)`
- `getCachedFile()` 改为 `getCachedData(key: string)`

### 6.5 components/dashboard/SummaryBanner.tsx

**改动：**
- 删除 `import { useGitHubClient }`
- 删除 `const client = useGitHubClient()`
- Dashboard summary 数据从 `/api/local-data?type=dashboard` 获取（已有逻辑）
- 去掉 GitHub 相关的刷新按钮

### 6.6 app/monitoring/page.tsx

**改动：**
- 删除 `import { useGitHubClient }`
- 删除 `const client = useGitHubClient()`
- 健康状态从 `/api/local-data?type=health` 获取（已有逻辑）
- 去掉 "请先配置 GitHub Token" 提示

### 6.7 components/dashboard/JwcNewsCard.tsx

**改动：**
- 删除 `import type { GitHubError } from "@/lib/github/errors"`
- 将 `GitHubError` 类型替换为通用 `Error`

### 6.8 app/settings/page.tsx

**改动：**
- 删除 `import { useSyncFromGitHub, useSyncToGitHub }`
- 删除 `syncFromGitHub` / `syncToGitHub` mutation 使用
- 删除 GitHub 同步相关的 UI（"从 GitHub 导入" / "推送到 GitHub" 按钮）
- 替换为"刷新数据"按钮（调用 `/api/fetch/all` 重新从教务系统抓取）
- 保留其他设置功能（主题切换、缓存清理、数据导出等）

### 6.9 lib/mobile-data.ts

**保留不变。** `readData()` 和 `writeData()` 已经通过 `/api/local-data` 和 `/api/local-save` API route 间接访问数据，接口不变。

### 6.10 lib/secure-auth.ts

**删除。** 不再需要 GitHub Token 安全存储。凭证安全存储在服务端 SQLite 中。

### 6.11 lib/auth.ts

**删除。** `verifyToken()`（验证 GitHub PAT）、`validateTokenFormat()`、`storeToken()` 等函数不再需要。

### 6.12 lib/schemas.ts

**改动：**
- 删除 `setupTokenSchema`（GitHub PAT 验证 schema）
- 新增 `schoolLoginSchema`（学校登录表单验证）

```ts
// 新增
export const schoolLoginSchema = z.object({
  schoolId: z.string().min(1, "请选择学校"),
  credentials: z.record(z.string(), z.string()),
});
```

---

## 7. 文件删除清单

| 文件/目录 | 原因 |
|-----------|------|
| `lib/github/client.ts` | GitHub API 客户端，不再需要 |
| `lib/github/cache.ts` | GitHub 内存缓存，不再需要 |
| `lib/github/errors.ts` | GitHub 错误类型，不再需要 |
| `lib/github/repos.ts` | GitHub 仓库配置（Health-525/timetable 等），不再需要 |
| `hooks/useGitHubClient.ts` | GitHub 客户端 hook，不再需要 |
| `lib/secure-auth.ts` | GitHub Token 安全存储，不再需要 |
| `lib/auth.ts` | GitHub PAT 验证，不再需要 |
| `app/api/vpn-proxy/route.ts` | VPN 代理（依赖 timetable/.env），改为学校适配器内部处理 |

**注意：** 删除文件时逐个使用 `delete_file` 工具，不使用 `rm -rf`。

---

## 8. 迁移策略与风险

### 8.1 渐进式改造步骤

改造按以下顺序进行，每完成一步就 commit，确保中间状态也能正常运行：

| 步骤 | 内容 | Commit 消息 |
|------|------|-------------|
| **Step 1** | 新建 `lib/server-db.ts`（SQLite 数据层）+ 安装 `better-sqlite3` | `feat: add SQLite server database layer` |
| **Step 2** | 改造 `/api/local-data/route.ts`（从 SQLite 读数据） | `feat: migrate local-data API to SQLite` |
| **Step 3** | 改造 `/api/local-save/route.ts`（写 SQLite，去掉 git commit） | `feat: migrate local-save API to SQLite` |
| **Step 4** | 新建 `lib/schools/types.ts` + `lib/schools/registry.ts` | `feat: add SchoolAdapter interface and registry` |
| **Step 5** | 搬入 NJTECH adapter 脚本（jwgl-crypto, jwgl-http, jwgl, library, jwc-news, grades） | `feat: add NJTECH school adapter` |
| **Step 6** | 新建 `/api/fetch/*` API routes | `feat: add data fetch API routes` |
| **Step 7** | 改造 `store/auth.ts`（学校认证替代 GitHub PAT） | `feat: replace GitHub PAT auth with school auth` |
| **Step 8** | 改造 `app/setup/page.tsx`（选学校+输入凭证） | `feat: redesign setup page with school selection` |
| **Step 9** | 改造 `app/ClientShell.tsx`（去掉 GitHub Token 恢复） | `feat: simplify ClientShell auth flow` |
| **Step 10** | 清理 `hooks/useQueries.ts`（删除 GitHub 同步） | `feat: remove GitHub sync from useQueries` |
| **Step 11** | 清理前端组件（SummaryBanner, monitoring, JwcNewsCard, settings） | `feat: remove GitHub dependencies from frontend components` |
| **Step 12** | 改造 `lib/db/index.ts`（Dexie 去掉 repo/sha） | `feat: simplify Dexie cache layer` |
| **Step 13** | 删除 `lib/github/` 目录 | `feat: remove GitHub client library` |
| **Step 14** | 删除 `hooks/useGitHubClient.ts` | `feat: remove useGitHubClient hook` |
| **Step 15** | 删除 `lib/secure-auth.ts` + `lib/auth.ts` | `feat: remove GitHub auth modules` |
| **Step 16** | 改造 `lib/schemas.ts`（删除 setupTokenSchema） | `feat: replace GitHub PAT schema with school login schema` |
| **Step 17** | 删除 `app/api/vpn-proxy/route.ts` | `feat: remove VPN proxy API route` |
| **Step 18** | 数据迁移工具（从 timetable JSON 导入到 SQLite） | `feat: add data migration tool` |
| **Step 19** | 更新 README.md | `docs: update README for independent architecture` |
| **Step 20** | 更新测试 | `test: update tests for new data layer` |

### 8.2 数据迁移

现有用户（包括你自己）的数据在 `timetable/data/*.json` 文件中。需要一个迁移工具将这些数据导入 SQLite：

```ts
// scripts/migrate-timetable-data.ts

import fs from "fs";
import path from "path";
import { ServerDB } from "../lib/server-db";

const TIMETABLE_DATA_DIR = process.env.TIMETABLE_DIR || "../timetable/data";
const TIMETABLE_OUT_DIR = process.env.TIMETABLE_OUT_DIR || "../timetable/_out";

const db = new ServerDB();

// 迁移 data/ 目录
const dataFiles = ["schedule.json", "assignments.json", "running.json", "library.json", "adjustments.json"];
for (const file of dataFiles) {
  const filePath = path.join(TIMETABLE_DATA_DIR, file);
  if (fs.existsSync(filePath)) {
    const key = file.replace(".json", "");
    const content = fs.readFileSync(filePath, "utf8");
    db.writeData(key, JSON.parse(content));
    console.log(`✅ migrated ${key}`);
  }
}

// 迁移 _out/ 目录
const outFiles = ["dashboard-summary.json", "health-status.json", "jwc_news.json", "jwgl_exams.json", "jwgl_grades_all.json", "knowledge-roadmap.json"];
for (const file of outFiles) {
  const filePath = path.join(TIMETABLE_OUT_DIR, file);
  if (fs.existsSync(filePath)) {
    const key = file.replace(".json", "").replace(/_/g, "-");
    const content = fs.readFileSync(filePath, "utf8");
    db.writeData(key, JSON.parse(content));
    console.log(`✅ migrated ${key}`);
  }
}

console.log("Migration complete!");
```

### 8.3 风险与缓解

| 风险 | 缓解措施 |
|------|---------|
| 教务系统 Cookie 过期 | adapter.login() 返回 expiresAt；前端定时刷新；过期时自动跳转 /setup 重新登录 |
| better-sqlite3 在 Vercel 上不工作 | Vercel 是 read-only 文件系统，SQLite 需要写入。部署到 VPS 或使用 Vercel + 外部 SQLite 服务（Turso） |
| 图书馆 JWT 需要手动获取 | 在 Setup 页面标注为"可选"；提供获取指南链接 |
| 正方教务系统改版 | adapter 内部做好错误处理；返回结构化错误信息；前端显示友好提示 |
| Electron 模式下 SQLite 路径 | Electron 使用 `app.getPath('userData')` 作为 SQLite 文件路径 |
| 多用户并发写入 SQLite | SQLite WAL 模式支持并发读；写入用事务保证一致性；单用户场景无问题 |

### 8.4 Electron 兼容性

Electron 模式下，SQLite 文件路径需要特殊处理：

```ts
// lib/server-db.ts 中 Electron 路径处理

function getDbPath(): string {
  // Electron: 使用 userData 目录
  if (typeof process !== 'undefined' && process.env.ELECTRON_DEV) {
    const electronPath = path.join(process.cwd(), "data", "scholarflow.db");
    return electronPath;
  }
  // 服务器部署: 使用项目 data 目录
  return path.join(process.cwd(), "data", "scholarflow.db");
}
```

### 8.5 依赖变更

| 新增依赖 | 用途 |
|----------|------|
| `better-sqlite3` | SQLite 数据库（替代文件系统 + GitHub API） |

| 可删除依赖 | 用途（不再需要） |
|------------|----------------|
| 无强制删除 | `chrome-remote-interface` 等是 timetable 的依赖，ScholarFlow 本身不依赖 |

**注意：** `better-sqlite3` 是 native 模块，Electron 构建时需要 `electron-rebuild`。

---

## 9. 新增 API Route 清单

| Route | 方法 | 功能 |
|-------|------|------|
| `/api/fetch/schedule` | POST | 从教务系统抓取课表 → 写入 SQLite |
| `/api/fetch/exams` | POST | 从教务系统抓取考试 → 写入 SQLite |
| `/api/fetch/grades` | POST | 从教务系统抓取成绩 → 写入 SQLite |
| `/api/fetch/library` | POST | 从图书馆 API 抓取座位 → 写入 SQLite |
| `/api/fetch/jwc-news` | POST | 爬取教务处通知 → 写入 SQLite |
| `/api/fetch/all` | POST | 一次性抓取所有数据 |
| `/api/auth/login` | POST | 学校登录验证 → 保存凭证 |
| `/api/auth/session` | GET | 获取当前登录状态 |

---

## 10. 类型定义补充

```ts
// types/index.ts 新增类型

export interface Course {
  title: string;
  weekday: number;
  periods: number[];
  weeks: string;
  location: string;
  teacher: string;
  // ... 其他教务系统字段
}

export interface Exam {
  subject: string;
  date: string;
  time: string;
  location: string;
  seatNumber?: string;
}

export interface GradeResult {
  gpa: string;
  totalCredits: number;
  requiredCourses: number;
  allCourses: GradeCourse[];
}

export interface GradeCourse {
  course: string;
  score: string;
  credit: string;
  type: string;
  semester: string;
}

export interface LibraryData {
  updated: string;
  summary: { total: number; used: number; avail: number; rate: number };
  libs: LibraryRoom[];
}

export interface LibraryRoom {
  lib_id: number;
  lib_name: string;
  lib_floor?: string;
  is_open: boolean;
  lib_rt: {
    seats_total: number;
    seats_used: number;
    seats_booking: number;
    seats_has: number;
    open_time_str: string;
    close_time_str: string;
  };
}

export interface NewsItem {
  title: string;
  url: string;
  date: string;
  category?: string;
}
```

---

## 11. 测试策略

### 11.1 新增测试

| 测试文件 | 覆盖内容 |
|----------|---------|
| `tests/server-db.test.ts` | SQLite 数据读写、凭证存储、过期检查 |
| `tests/njtech-adapter.test.ts` | NJTECH adapter 接口合规性 |
| `tests/njtech-jwgl-crypto.test.ts` | RSA 加密正确性 |
| `tests/njtech-grades.test.ts` | GPA 计算逻辑 |

### 11.2 修改测试

| 测试文件 | 改动 |
|----------|------|
| `tests/schedule.test.ts` | 数据来源从 mock JSON 改为 mock SQLite |
| `tests/assignment-utils.test.ts` | 无改动（纯逻辑测试） |
| `tests/db.test.ts` | Dexie 测试去掉 repo/sha 字段 |
| `tests/features.test.ts` | 去掉 GitHub 相关测试 |

---

## 12. 实施优先级

**P0（必须先做）：**
1. SQLite 数据层（Step 1-3） — 这是所有后续步骤的基础
2. SchoolAdapter 接口（Step 4） — 定义抽象

**P1（核心功能）：**
3. NJTECH adapter（Step 5-6） — 数据抓取能力
4. 登录改造（Step 7-9） — 用户入口

**P2（清理）：**
5. 前端清理（Step 10-12） — 去掉 GitHub 依赖
6. 文件删除（Step 13-17） — 删除废弃代码

**P3（完善）：**
7. 数据迁移工具（Step 18）
8. 文档更新（Step 19）
9. 测试更新（Step 20）

---

*Spec 结束。实施时按 Step 顺序逐步推进，每完成一步 commit。*
