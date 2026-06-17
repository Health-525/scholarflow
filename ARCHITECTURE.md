# ScholarFlow 系统架构

> 本地优先 + SQLite 数据层 + 插件化学校适配器的一体化学习管理平台

## 系统总览

```
┌─────────────────────────────────────────────────────────────┐
│                    👤 用户交互层                              │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Web          │  │ Electron     │  │ PWA / Capacitor  │  │
│  │ (浏览器)     │  │ (桌面端)     │  │ (移动端)         │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │
│         │                 │                    │           │
└─────────┼─────────────────┼────────────────────┼───────────┘
          │                 │                    │
          ▼                 ▼                    ▼
┌─────────────────────────────────────────────────────────────┐
│                    ScholarFlow (Next.js App Router)          │
│                                                             │
│  ┌─────────┐ ┌─────────┐ ┌────────┐ ┌────────┐ ┌────────┐ │
│  │ Dashboard│ │Schedule │ │Assignments│ │Running │ │Reports │ │
│  └────┬────┘ └────┬────┘ └────┬───┘ └────┬───┘ └────┬───┘ │
│       │           │           │          │          │      │
│  ┌────┴───────────┴───────────┴──────────┴──────────┴───┐  │
│  │         TanStack Query + Zustand (UI state)          │  │
│  └────────────────────┬──────────────────────────────────┘  │
│                       │                                      │
│  ┌────────────────────┴──────────────────────────────────┐  │
│  │         Next.js API Routes                           │  │
│  │  /api/local-data  /api/local-save  /api/fetch/*      │  │
│  └────────────────────┬──────────────────────────────────┘  │
│                       │                                      │
│  ┌────────────────────┴──────────────────────────────────┐  │
│  │         SQLite (better-sqlite3) 本地数据库            │  │
│  │  data_store  ·  credentials  ·  schema_version        │  │
│  └────────────────────────────────────────────────────────┘  │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    学校适配器 (School Adapter)                │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ NJTECH Adapter: 登录 · 课表 · 考试 · 成绩 · 通知      │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 数据流

### 查询路径（系统 → 展示）
```
ScholarFlow (Web/PWA/Electron)
  → TanStack Query useQuery
  → /api/local-data?type=<type>&schoolId=<id>&userId=<id>
  → ServerDB.readData(key) from SQLite
  → React 组件渲染
```

### 写回路径（用户操作 → 持久化）
```
ScholarFlow UI 操作
  → /api/local-save (POST { key, content })
  → ServerDB.writeData(key, content)
  → SQLite 本地持久化
  → 使 TanStack Query 缓存失效
```

### 同步路径（学校教务 → 本地）
```
用户点击同步 / ClientShell 恢复会话
  → /api/auth/session (读取已保存凭证)
  → /api/fetch/all (POST { schoolId, username })
  → SchoolAdapter 抓取课表 / 考试 / 成绩 / 通知
  → ServerDB.writeData(`schedule:<prefix>`, ...)
  → 重新生成 dashboard-summary 缓存
```

## 核心模块

### 1. 本地数据库层 (`lib/server-db.ts`)

ServerDB 以 `better-sqlite3` 作为底层存储引擎，读写单一 SQLite 数据库文件 `scholarflow.db`。每次写入为单行 `upsert`，不再全文件重写，借助 WAL 与事务原子性消除并发写损坏与全文件覆盖问题。ServerDB 公开 API 保持不变（key-value 与 credentials 方法），调用方无需改动。

```
ServerDB (better-sqlite3 单例)
├── readData(key)            → 读取 JSON 化数据（content 列存 JSON 字符串）
├── writeData(key, content)  → 单行 upsert 写入/更新数据
├── deleteData(key)          → 删除数据
├── deleteDataByPrefix(prefix) → 按前缀删除（退出登录清理）
├── seedFromTimetable(prefix)  → 从旧 timetable/data 迁移数据
│
├── saveCredentials(schoolId, userId, data, expiresAt)
├── getCredentials(schoolId, userId)
└── findActiveCredentials()
```

表结构（与 `lib/server-db.ts` 最终 SQLite Schema 一致）:

```sql
CREATE TABLE IF NOT EXISTS data_store (
  key        TEXT PRIMARY KEY,
  content    TEXT NOT NULL,        -- 存 JSON 字符串（兼容 readData 的 JSON.parse）
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS credentials (
  school_id       TEXT NOT NULL,
  user_id         TEXT NOT NULL,
  credential_data TEXT NOT NULL,   -- JSON 字符串
  expires_at      INTEGER,         -- 可空
  created_at      INTEGER NOT NULL,
  PRIMARY KEY (school_id, user_id)
);

CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER NOT NULL
);
```

并发安全 PRAGMA: `journal_mode = WAL`、`synchronous = NORMAL`、`busy_timeout = 5000`、`foreign_keys = ON`。`credentials` 采用 `(school_id, user_id)` 复合主键，`saveCredentials` 经 `INSERT ... ON CONFLICT` upsert 表达"存在则更新、否则插入"语义。

数据 key 约定: `"<type>:<schoolId>:<userId>"`，例如 `schedule:njtech:202321144057`，实现账号隔离；`jwc-news` 等全校共享数据使用 `"<type>:<schoolId>"`（不含 userId）。

#### 数据目录解析 (Stable_Data_Dir)

`scholarflow.db` 始终落在打包产物之外的稳定目录，重装/更新不丢数据。解析优先级:

1. **环境变量优先** — `SCHOLARFLOW_DATA_DIR`（由 Electron 主进程注入）非空时直接使用。
2. **便携版** — exe 同级目录下的 `ScholarFlowData`（主进程依据 `PORTABLE_EXECUTABLE_DIR` 解析）。
3. **安装版** — `app.getPath('userData')/data`（位于 `%APPDATA%`，不被卸载/更新覆盖）。
4. **env 缺失回退（home 锚点）** — `ServerDB` 在缺失 `SCHOLARFLOW_DATA_DIR` 时不再回退到打包目录内的 `process.cwd()/data`，而是锚定用户主目录: Windows 为 `%APPDATA%\ScholarFlow\data`，其他平台为 `~/.scholarflow/data`。若 `cwd` 命中打包标志段（`app.asar` / `.next` / `standalone` / `dist`）则一律走 home 锚点，**绝不**写入打包目录。

`ServerDB` 构造时将最终生效的 `scholarflow.db` 绝对路径输出到运行日志，便于诊断路径漂移。

#### 原生模块打包要求 (Native_Module)

`better-sqlite3` 携带 C++ 原生模块（`.node`），其二进制只能被 ABI 匹配的运行时加载，打包需满足:

- **针对 Electron ABI 重建** — electron-builder `build.npmRebuild: true`（必要时辅以 `electron-rebuild -f -w better-sqlite3` 作为确定性兜底），使原生模块按 Electron 运行时 ABI 编译，而非系统 Node ABI。
- **`.node` 解包到 asar 外** — `build.asarUnpack` 包含 `**/node_modules/better-sqlite3/**/*` 与 `**/*.node`，确保运行时可加载原生模块。
- **db 文件在 asar 外** — `scholarflow.db` 落在 Stable_Data_Dir（asar 归档之外），保证可读写。
- **standalone 子进程运行于 Electron ABI** — 主进程经 `child_process.fork` 派生 Next.js standalone `server.js`，默认使用 Electron 可执行文件并注入 `ELECTRON_RUN_AS_NODE=1`，子进程以纯 Node 模式运行但仍使用 Electron 的 ABI；故 `better-sqlite3` 必须按 Electron ABI 重建。`better-sqlite3` 须位于 `dependencies`（非 devDependencies）方能被打入产物。

### 2. 学校适配器 (`lib/schools/`)

```
SchoolAdapter 接口
├── id, name
├── loginFields: LoginField[]     → setup 页动态渲染
├── login(credentials)            → 验证并返回凭证
├── fetchSchedule(credentials)    → 课表数据
├── fetchExams(credentials)       → 考试安排
├── fetchGrades(credentials)      → 成绩 + GPA
├── fetchLibrary?(credentials)    → 图书馆座位（可选）
├── fetchJwcNews?(existing)       → 教务通知（可选）
└── getCurrentSemester?()         → 学期元信息（可选）

Registry:
  registerSchool(adapter) / getAdapter(id) / getAllSchools()
```

### 3. 数据 API (`app/api/`)

```
/api/local-data?type=<type>&schoolId=<id>&userId=<id>
  → 读取各类数据，支持 dashboard 缓存自动失效

/api/local-save
  → 写入数据到 SQLite

/api/fetch/all
  → 调用 SchoolAdapter 同步课表/考试/成绩/通知
  → 写入 SQLite 并刷新 dashboard-summary

/api/auth/login / session / logout
  → 学校凭证登录与会话管理
```

### 4. 课表引擎 (`lib/schedule/`)

```
输入: RawScheduleData (JSON)
  ├── meta: { tz, week1_monday }
  ├── courses: [{ title, weekday, periods, weeks }]
  ├── special: [{ title, weekday[], weeks, times[] }]
  └── periodTimes: { "1": "08:10-08:55", ... }

输出: { weekNum, items: DayItem[] }
  ├── parseWeekSpec("2-13,15")   → [2,3,...,13,15]
  ├── getWeekNumber(date, week1) → 当前周数
  ├── weekday1to7(date)          → 1-7 (周一=1)
  └── getItemsForDate(schedule, date)
       → 匹配周次 + 星期 + 节次 + special覆盖
```

### 5. 安全模型

```
凭证生命周期:
  用户在 setup 页输入 → /api/auth/login
  → SchoolAdapter.login(credentials) 验证
  → ServerDB.saveCredentials(schoolId, userId, data, expiresAt)
      ├── Electron: 可结合 safeStorage 加密 credential_data
      └── Web/PWA: 存储在服务端 SQLite（本地运行时）

认证恢复:
  ClientShell mount → /api/auth/session
  → ServerDB.findActiveCredentials()
  → 若存在有效凭证则 setAuth(schoolId, userId)
  → 在受保护页面自动 /api/fetch/all 刷新数据
```

### 6. 渲染管道 (`lib/markdown/`)

```
Markdown 源文本
  → unified() 管道
      ├── remark-parse (解析)
      ├── remark-gfm (表格/任务列表)
      ├── wiki-link-plugin ([[内部链接]])
      └── callout-plugin (> [!NOTE] 块)
  → remark-rehype (转换)
  → DOMPurify.sanitize() (XSS 清洗)
  → rehype-stringify (序列化)
  → React dangerouslySetInnerHTML
```

## 技术决策

| 决策 | 选择 | 理由 |
|------|------|------|
| 本地数据库 | SQLite (better-sqlite3) | 零运维, 结构化, 单行 upsert + WAL 消除并发写损坏与全文件重写 |
| 原生模块打包 | npmRebuild / electron-rebuild + asarUnpack | 针对 Electron ABI 重建 `.node`, 解包到 asar 外, db 文件落稳定目录 |
| 数据访问 | Next.js API Routes + TanStack Query | 统一前后端数据层，支持 SSR 与本地优先 |
| 学校对接 | 插件化 SchoolAdapter | 新增学校只需实现接口并注册，不改核心逻辑 |
| 状态管理 | Zustand (persist) | 轻量, 中间件生态 |
| UI 组件 | 自建 + base-ui | 纸质感定制需求 |
| 图表 | Recharts | React 原生, 可组合 |
| AI | Ollama 本地 | 隐私, 零成本, 离线可用 |
| 构建 | Next.js + Electron-builder | SSR + 桌面端统一代码 |

## 开发与构建流程

### 开发热更新（日常迭代）

日常开发 Electron 桌面端时，使用热更新脚本而非全量打包：

```bash
npm run electron:hot:win
```

该脚本设置 `ELECTRON_DEV=1`，并通过 `concurrently` 同时启动两个进程：

```
concurrently "next dev" "electron ."
  ├── next dev   → Next.js 开发服务器（端口 3000，系统 Node 运行时，支持 HMR 热更新）
  └── electron . → Electron 主进程，加载 http://localhost:3000
```

改动前端/服务端代码后由 `next dev` 自动热更新，无需重启或重新打包，迭代秒级生效。

### 发布打包（仅用于产物）

`electron:build`（及 `electron:build:portable` / `electron:build:installer`）**仅用于生成可分发的发布产物**（便携版 / 安装版），不用于日常开发迭代。全量打包耗时较长，且会触发 Native_Module 针对 Electron ABI 的重建与 standalone 输出复制等步骤，仅在需要验证打包形态或出包时执行。

| 场景 | 命令 | 用途 |
|------|------|------|
| 日常开发迭代 | `electron:hot:win` | 热更新调试，秒级生效 |
| 生成便携版产物 | `electron:build:portable` | 发布可分发的便携版 |
| 生成安装版产物 | `electron:build:installer` | 发布可分发的安装版 |
| 生成全部发布产物 | `electron:build` | 出包/验证打包形态 |

### 热更新模式下的数据目录解析

开发热更新模式（`electron:hot:win`，`IS_DEV=true`）与打包态的数据路径解析行为**不同**，开发者需据此区分：

- 热更新模式下主进程**不调用 `launchServer()`**，因此不会 `fork` standalone server；服务端由 `next dev`（端口 3000）在**系统 Node 运行时**下运行。
- 由于未经主进程 `fork`，**`SCHOLARFLOW_DATA_DIR` 不会被注入**。此时 `ServerDB` 的 `resolveDataDir` 以 `cwd = 项目根目录`（而非打包目录）解析，且项目根不命中打包标志段（`app.asar` / `.next` / `standalone` / `dist`），因此数据写入 `<repo>/data/scholarflow.db`。
- 这与打包态的 Stable_Data_Dir 不同：便携版为 exe 同级 `ScholarFlowData`，安装版为 `app.getPath('userData')/data`。

| 形态 | 运行时 | `SCHOLARFLOW_DATA_DIR` | 数据库路径 |
|------|--------|------------------------|-----------|
| 开发热更新（`IS_DEV=true`） | 系统 Node（`next dev`） | 未注入 | `<repo>/data/scholarflow.db` |
| 打包态便携版 | Electron ABI（`fork`） | 已注入 | exe 同级 `ScholarFlowData/scholarflow.db` |
| 打包态安装版 | Electron ABI（`fork`） | 已注入 | `app.getPath('userData')/data/scholarflow.db` |

因此开发态产生的数据落在仓库内 `data/` 目录，与打包安装后用户机器上的稳定数据目录相互独立，互不干扰。
