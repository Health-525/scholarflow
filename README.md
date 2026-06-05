# 📚 ScholarFlow — 统一学习管理中枢

> Electron + Next.js 桌面应用 · PWA 离线支持 · AI 学习助手

ScholarFlow 是一个面向大学生的一体化学习管理平台，提供课表、作业、跑步、日报、知识库管理，并内置本地 AI 助手（Ollama）。支持 Windows/macOS 桌面端和移动端 PWA。

---

## 🏗 架构总览

```
┌──────────────────────────────────────────────────────┐
│                  ScholarFlow (Electron + Next.js)    │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌────────────────────┐ │
│  │ Dashboard │  │ Schedule │  │ Assignments        │ │
│  │ 5 Cards   │  │          │  │ (CRUD + Undo)      │ │
│  └──────────┘  └──────────┘  └────────────────────┘ │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌────────────────────┐ │
│  │ Running  │  │ Reports  │  │ AI Chat (Ollama)   │ │
│  │          │  │ Daily/   │  │ 本地 LLM 对话       │ │
│  └──────────┘  │ Weekly   │  └────────────────────┘ │
│                 └──────────┘                         │
│                                                      │
│  ═══════════════ Data Layer ═══════════════         │
│  ┌─────────────────────────────────────────────┐    │
│  │ TanStack Query v5  (SWR, dedup, cache)      │    │
│  │  ↕ sync                                     │    │
│  │ Dexie.js / IndexedDB  (offline-first)       │    │
│  │  ↕                                          │    │
│  │ GitHub API  (primary data store)            │    │
│  └─────────────────────────────────────────────┘    │
│                                                      │
│  ═══════════════ Security ═══════════════           │
│  ┌─────────────────────────────────────────────┐    │
│  │ Electron: safeStorage (DPAPI/Keychain)       │    │
│  │ PWA/Web: localStorage + base64               │    │
│  └─────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────┘
         ↕ GitHub API
┌──────────────────────────────────────────────────────┐
│  Health-525/timetable (execution)  ← 数据源 1        │
│  Health-525/jiangshu-study (content) ← 数据源 2      │
└──────────────────────────────────────────────────────┘
```

## 📦 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 框架 | Next.js (App Router) | ^15.0 |
| UI | React | ^19.0 |
| 语言 | TypeScript | ^5 (strict) |
| 样式 | Tailwind CSS + 自定义 CSS 变量 | ^3.4 |
| 状态管理 | Zustand (persist) | ^5.0 |
| 数据请求 | TanStack Query | ^5 |
| 离线存储 | Dexie.js / IndexedDB | ^4 |
| AI | Ollama (本地 LLM) | ^0.5 |
| 桌面端 | Electron + electron-builder | ^42 |
| PWA | next-pwa / Workbox | ^5.6 |
| Markdown | unified + remark-gfm + rehype | ^11 |
| 测试 | Vitest + Testing Library | ^2 |

## 🚀 快速开始

### 环境要求

- Node.js 20+
- npm 10+
- (可选) Ollama 本地 LLM 服务
- (可选) GitHub Personal Access Token（用于数据同步）

### 安装

```bash
# 克隆仓库
cd scholarflow

# 安装依赖
npm install

# 配置环境变量（可选）
cp .env.local.example .env.local
# 编辑 .env.local，填入 GitHub Token
```

### 开发

```bash
# Web 开发模式
npm run dev
# → http://localhost:3000

# Electron 开发模式
npm run electron:dev
```

### 构建

```bash
# Web 生产构建
npm run build

# Electron Windows 安装包
npm run electron:build
```

### 本地 AI 助手

```bash
# 安装 Ollama
# 访问 https://ollama.com 下载

# 拉取中文友好模型
ollama pull qwen2.5

# 启动后，ScholarFlow 右下角点击 🤖 即可使用
```

## 📂 项目结构

```
scholarflow/
├── app/                    # Next.js App Router
│   ├── layout.tsx          # 根布局（主题、字体、QueryProvider）
│   ├── page.tsx            # 仪表板主页
│   ├── ClientShell.tsx     # 认证守卫 + 安全Token恢复
│   ├── QueryProvider.tsx   # TanStack Query 提供者
│   ├── globals.css         # 完整设计系统（~400行）
│   ├── schedule/           # 课表页
│   ├── assignments/        # 作业管理页
│   ├── running/            # 跑步管理页
│   ├── reports/            # 日报/周报
│   ├── notes/              # 笔记系统
│   ├── knowledge/          # 知识库
│   ├── settings/           # 设置
│   └── setup/              # 初始设置向导
├── components/
│   ├── layout/             # AppShell, SideNav, BottomNav
│   ├── dashboard/          # 5张仪表板卡片
│   ├── chat/               # AI 聊天组件
│   ├── markdown/           # Markdown 渲染组件
│   ├── ui/                 # 通用 UI 组件
│   └── ...                 # 各模块组件
├── lib/
│   ├── github/             # GitHub API 客户端
│   │   ├── client.ts       # 核心：getFile/putFile/缓存
│   │   ├── cache.ts        # 内存缓存（TTL 60s）
│   │   ├── errors.ts       # 类型化错误处理
│   │   └── repos.ts        # 仓库配置
│   ├── db/
│   │   └── index.ts        # Dexie.js 离线数据库
│   ├── schedule/           # 课表解析引擎
│   │   ├── schedule.ts     # 核心：课程/周次/日期计算
│   │   └── adjustments.ts  # 调课合并逻辑
│   ├── secure-auth.ts      # 安全Token存储抽象
│   └── theme.ts            # 主题系统（亮/暗/跟随系统）
├── store/
│   ├── auth.ts             # 认证状态（Zustand persist）
│   ├── assignments.ts      # 作业状态（乐观更新+回滚）
│   ├── running.ts          # 跑步状态
│   └── theme.ts            # 主题状态（Zustand persist）
├── hooks/
│   ├── useQueries.ts       # TanStack Query 数据钩子（新）
│   ├── useGitHubClient.ts  # GitHubClient 工厂
│   ├── useSchedule.ts      # 课表 Hook（旧，待迁移）
│   └── useAssignments.ts   # 作业 Hook（旧，待迁移）
├── types/
│   ├── index.ts            # 全局类型定义
│   └── globals.d.ts        # Electron API 类型声明
├── electron/
│   ├── main.js             # Electron 主进程 + safeStorage IPC
│   ├── preload.js          # 安全 IPC 桥接
│   └── postbuild.js        # 构建后处理
├── tests/
│   └── setup.ts            # 测试配置
├── public/
│   └── icons/              # PWA 图标
└── package.json
```

## 🔐 安全设计

### Token 存储

| 环境 | 存储方式 | 安全性 |
|------|----------|--------|
| **Electron** | `safeStorage` → DPAPI (Windows) / Keychain (macOS) | 🔒 系统级加密 |
| **Web / PWA** | localStorage + base64 混淆 | ⚠️ 基础混淆，非加密 |

### 数据流安全

```
用户输入 Token
  → setup 页面
  → validateTokenFormat() 格式校验
  → verifyToken() GitHub API 验证
  → secureStoreToken() 安全持久化
      ├─ Electron: safeStorage.encryptString() → 写入加密文件
      └─ Web: localStorage + base64
  → Zustand store (内存，session 级别)
  → GitHub API 请求（Bearer Token）
```

## 📱 PWA 支持

ScholarFlow 是一等 PWA 公民，支持：

- 安装到桌面/主屏幕
- 离线访问（Service Worker + IndexedDB 缓存）
- 推送通知（待实现）
- 响应式布局（移动端底部导航栏）

Service Worker 缓存策略：

| 资源 | 策略 | TTL |
|------|------|-----|
| `/_next/static/*` | CacheFirst | 365天 |
| `schedule.json` | CacheFirst | 5分钟 |
| `assignments.json` | StaleWhileRevalidate | - |
| GitHub API GET | NetworkFirst | 10秒超时 |

## 🎨 设计系统

项目拥有精心设计的纸质感设计系统，不依赖第三方 UI 库：

- **亮色/暗色主题**：自动检测 `prefers-color-scheme` + 手动切换
- **纸质感**：SVG 噪点纹理、柔和阴影、米色基调
- **主题色**：深靛蓝墨水色 `#2a4494`
- **自定义 CSS 变量**：`--accent`, `--surface`, `--text-primary` 等
- **动画**：`fadeSlideUp`, `breathe`, `shimmer`（带交错延迟）
- **响应式**：移动端底部 TabBar → 桌面端侧边栏

## 📊 数据来源

| 数据 | GitHub 仓库 | 路径 | 刷新策略 |
|------|------------|------|---------|
| 课表 | `timetable` | `data/schedule.json` | SWR 2min |
| 调课 | `timetable` | `data/adjustments.json` | SWR 2min |
| 作业 | `timetable` | `data/assignments.json` | SWR 1min |
| 跑步 | `timetable` | `data/running.json` | SWR 1min |
| 教务新闻 | `jiangshu-study` | `_data/jwc_news.json` | SWR 10min |
| 日报 | `jiangshu-study` | `日报/*.md` | Directory listing |
| 笔记 | `jiangshu-study` | `0*-*/**/*.md` | Directory listing |

## 🧪 测试

```bash
# 运行所有测试
npm test

# Watch 模式
npm run test:watch
```

## 📄 许可证

Copyright © 2026 Health-525

---

*最后更新：2026-06-05 — Phase 1：TanStack Query + Ollama AI + 安全Token + IndexedDB 离线层*
