# ScholarFlow 系统架构

> 三层架构 + 离线优先 + GitHub 作为后端的多 Agent 学习管理平台

## 系统总览

```
┌─────────────────────────────────────────────────────────────┐
│                    👤 用户交互层                              │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Obsidian     │  │ ScholarFlow  │  │ iPhone 日历      │  │
│  │ (内容编辑)   │  │ (Web/PWA/    │  │ (订阅 ICS)       │  │
│  │              │  │  Desktop)    │  │                  │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │
│         │                 │                    │           │
└─────────┼─────────────────┼────────────────────┼───────────┘
          │                 │                    │
          ▼                 ▼                    │
┌─────────────────────────────────────────────────┼───────────┐
│                    🔧 执行层 (timetable)         │           │
│                                                 │           │
│  ┌─────────┐ ┌─────────┐ ┌────────┐ ┌────────┐ │           │
│  │课表管家 │ │作业管家 │ │调课助手│ │运动监督│ │           │
│  │06:00    │ │dispatch │ │dispatch│ │dispatch│ │           │
│  └────┬────┘ └────┬────┘ └────┬───┘ └────┬───┘ │           │
│       │           │           │          │      │           │
│  ┌────┴───────────┴───────────┴──────────┴───┐  │           │
│  │         GitHub Actions (8 工作流)          │  │           │
│  └────────────────────┬──────────────────────┘  │           │
│                       │                          │           │
│  ┌────────────────────┴──────────────────────┐  │           │
│  │  data/schedule.json  assignments.json     │  │           │
│  │  data/adjustments.json  running.json      │  │           │
│  └───────────────────────────────────────────┘  │           │
└─────────────────────────┬───────────────────────┼───────────┘
                          │                       │
                          ▼                       ▼
┌─────────────────────────────────────────────────┴───────────┐
│                    📚 内容层 (jiangshu-study)                 │
│                                                             │
│  Obsidian 知识库: 课程笔记 + 日报 + 周报 + 灵感 + 知识画像   │
│  09-日常处理/ : 课表.md (自动) + 作业.md (人机协作)          │
│  public/schedule.ics : 日历订阅发布                           │
└─────────────────────────────────────────────────────────────┘
```

## 数据流

### 输入路径（用户 → 系统）
```
Obsidian Markdown 编辑
  → git push to GitHub
  → Repository Dispatch 事件
  → timetable Agent 唤醒
  → 解析 Markdown → 更新 JSON → 生成产物
  → 回写 Markdown/JSON
  → Obsidian 自动同步（git pull）
```

### 查询路径（系统 → 展示）
```
ScholarFlow (Web/PWA/Electron)
  → TanStack Query useQuery
  → GitHubClient.getFile / listDirectory
  → 三层缓存: Memory (60s TTL) → IndexedDB (Dexie.js) → GitHub API
  → React 组件渲染
```

### 写回路径（用户操作 → 持久化）
```
ScholarFlow UI 操作
  → GitHubClient.putFile (GET sha → PUT with sha → 409重试)
  → 使缓存失效
  → 离线时排队到 IndexedDB mutations queue
  → 恢复在线后批量同步
```

## 核心模块

### 1. GitHub Client (`lib/github/`)

```
GitHubClient
├── getFile(repo, path)     → FileContent (缓存优先)
├── listDirectory(repo, path) → DirectoryEntry[]
├── putFile(repo, path, content, action) → SHA-based write
├── invalidateCache(repo, path)
│
├── githubCache (内存, TTL 60s)
├── REPOS 配置 (环境变量可覆盖)
└── 错误类型: not_found | rate_limited | unauthorized | network_error
```

### 2. 离线层 (`lib/db/`)

```
Dexie.js IndexedDB
├── cachedFiles: repo + path → content + sha + cachedAt
├── mutationsQueue: 离线写入队列
└── 策略:
    - 在线: GitHub API 直写 + 更新缓存
    - 离线: 写入队列 + UI 乐观更新
    - 恢复在线: 批量冲刷队列
```

### 3. 课表引擎 (`lib/schedule/`)

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

### 4. 安全模型

```
Token 生命周期:
  用户输入 → validateTokenFormat() → verifyToken() (GitHub API)
  → secureStoreToken()
      ├── Electron: safeStorage.encryptString() → 写入加密文件
      │              (Windows DPAPI / macOS Keychain)
      └── Web/PWA: localStorage + base64 混淆

认证恢复:
  ClientShell mount → secureRetrieveToken()
  → migrateLegacyToken() (旧格式迁移)
  → 环境变量 fallback (NEXT_PUBLIC_GH_TOKEN, 仅开发)
```

### 5. 渲染管道 (`lib/markdown/`)

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
| 数据库 | JSON 文件 + GitHub API | 零运维, 版本控制, 数据量 <50KB |
| 离线存储 | Dexie.js / IndexedDB | 浏览器原生, 无额外依赖 |
| 数据同步 | TanStack Query v5 | SWR + dedup + 退避重试 |
| 状态管理 | Zustand (persist) | 轻量, 中间件生态 |
| UI 组件 | 自建 + shadcn/base-ui | 纸质感定制需求 |
| 图表 | Recharts | React 原生, 可组合 |
| AI | Ollama 本地 | 隐私, 零成本, 离线可用 |
| 构建 | Next.js + Electron-builder | SSR + 桌面端统一代码 |
