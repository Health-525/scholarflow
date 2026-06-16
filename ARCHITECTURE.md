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

```
ServerDB (better-sqlite3 单例)
├── readData(key)            → 读取 JSON 化数据
├── writeData(key, content)  → 写入/更新数据
├── deleteData(key)          → 删除数据
├── deleteDataByPrefix(prefix) → 按前缀删除（退出登录清理）
├── seedFromTimetable(prefix)  → 从旧 timetable/data 迁移数据
│
├── saveCredentials(schoolId, userId, data, expiresAt)
├── getCredentials(schoolId, userId)
└── findActiveCredentials()

表结构:
  data_store(key TEXT PRIMARY KEY, content TEXT, updated_at INTEGER)
  credentials(school_id, user_id, credential_data, expires_at, created_at)
  schema_version(version INTEGER PRIMARY KEY, applied_at INTEGER)
```

数据 key 约定: `"<type>:<schoolId>:<userId>"`，例如 `schedule:njtech:202321144057`，实现账号隔离。

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
| 本地数据库 | SQLite (better-sqlite3) | 零运维, 结构化, 适配 Electron/PWA/Server 多场景 |
| 数据访问 | Next.js API Routes + TanStack Query | 统一前后端数据层，支持 SSR 与本地优先 |
| 学校对接 | 插件化 SchoolAdapter | 新增学校只需实现接口并注册，不改核心逻辑 |
| 状态管理 | Zustand (persist) | 轻量, 中间件生态 |
| UI 组件 | 自建 + base-ui | 纸质感定制需求 |
| 图表 | Recharts | React 原生, 可组合 |
| AI | Ollama 本地 | 隐私, 零成本, 离线可用 |
| 构建 | Next.js + Electron-builder | SSR + 桌面端统一代码 |
