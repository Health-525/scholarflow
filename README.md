<div align="center">

<img src="public/icons/icon-512.png" alt="ScholarFlow" width="96" />

# ScholarFlow

**专为大学生打造的一体化学习管理桌面应用**

[![CI](https://github.com/Health-525/scholarflow/actions/workflows/ci.yml/badge.svg)](https://github.com/Health-525/scholarflow/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/github/license/Health-525/scholarflow)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)
[![Release](https://img.shields.io/github/v/release/Health-525/scholarflow?include_prereleases)](https://github.com/Health-525/scholarflow/releases)

[**下载**](https://github.com/Health-525/scholarflow/releases) · [报告问题](https://github.com/Health-525/scholarflow/issues/new?template=bug_report.md) · [提交建议](https://github.com/Health-525/scholarflow/issues/new?template=feature_request.md)

</div>

---

## 它能做什么

ScholarFlow 把散落在各处的大学生日常工具整合进一个 **本地优先** 的桌面应用——教务数据自动同步、课表作业一览无余。

| 模块 | 功能要点 |
|------|---------|
| 🗓 **课表** | 自动拉取教务系统课表，支持调课合并，一键导出 ICS 到日历 |
| 📝 **作业** | CRUD + 乐观更新 + 撤销，完成进度实时显示 |
| 📚 **图书馆** | 查座位实时空位、可视化座位图、一键预约/取消（需校园 VPN） |
| 🎓 **成绩 & GPA** | 从教务系统同步成绩，自动计算 GPA，环形图按学期展示 |
| ⏱ **番茄钟** | 专注/休息循环计时，支持自定义时长 |
| 🏃 **跑步打卡** | 跑步记录与进度追踪，Goal 环形进度 |
| 🎯 **每日目标** | 当日目标 + 连续完成 Streak + 历史日历 |
| 🖥️ **活动分析** | Electron 独占：自动统计各应用使用时长，分类饼图 |
| 📰 **教务公告** | 教务处新闻自动推送到仪表板 |
| 📓 **笔记** | Markdown 全功能渲染，支持 GFM 语法 |
| 🔔 **智能提醒** | 考试倒计时、作业 DDL 桌面通知 |

![仪表板截图](docs/dashboard.png)

---

## 平台能力矩阵

ScholarFlow 以 **Electron 桌面端**为第一公民，PWA 和移动端为轻量模式。

| 功能 | Electron (Windows/macOS) | Web / PWA | Android (Capacitor) |
|------|:---:|:---:|:---:|
| 课表 / 考试 / 成绩同步 | ✅ | ✅ | ⚠️ 实验性 |
| 作业、目标、番茄钟 | ✅ | ✅ | ⚠️ 实验性 |
| 图书馆座位预约 | ✅ | ✅ | ⚠️ 实验性 |
| 桌面通知 | ✅ | ⚠️ 浏览器权限 | ⚠️ |
| 教务密码加密存储（记住密码） | ✅ DPAPI / Keychain | ❌ 不保存 | ❌ |
| 本地 SQLite 数据库 | ✅ | ✅ standalone | ❌ |
| 活动窗口分析 | ✅ | ❌ | ❌ |
| 后台自动刷新（关窗运行） | ✅ | ❌ | ❌ |
| PWA 离线访问 | — | ✅ | — |

> ⚠️ = 功能可用但未经完整测试 / 存在平台限制

---

## 技术亮点

**本地优先，数据不出设备**
所有数据落 SQLite（better-sqlite3），教务密码走 OS 级加密（Windows DPAPI / macOS Keychain），不经任何第三方服务器。

**Electron × Next.js 同构架构**
同一份代码跑 Electron 桌面端和 Web PWA，桌面端独享 safeStorage 加密、活动窗口追踪、摄像头皱眉检测。

**学校适配器插件化**
`lib/schools/` 下按学校注册适配器，接入新学校教务系统只需实现一套接口，目前内置南京工业大学（NJTECH）。

**自动刷新调度器**
主进程后台调度器（12h 基准 + 6h jitter + 指数退避），记住密码后静默同步，关窗也能跑。

---

## 快速开始

### 直接下载

前往 [Releases](https://github.com/Health-525/scholarflow/releases) 下载最新 Windows 安装包（`.exe`）或免安装便携版。

### 从源码运行

**环境要求：** Node.js 20+，npm 10+

```bash
git clone https://github.com/Health-525/scholarflow.git
cd scholarflow
npm install
```

```bash
# Web 开发模式
npm run dev
# → http://localhost:3000

# Electron 桌面开发模式（需先切换 ABI）
npm run abi:node
npm run electron:dev
```

```bash
# 生产构建（Web）
npm run build

# 打包 Electron Windows 安装包
npm run electron:build
```

> **注意：** 项目使用自定义 ABI 切换脚本管理 better-sqlite3 原生模块。
> 开发时用 `npm run abi:node`，打包时构建脚本自动处理。

---

## 项目结构

```
scholarflow/
├── app/                    # Next.js App Router 页面
│   ├── schedule/           # 课表
│   ├── assignments/        # 作业
│   ├── library/            # 图书馆座位
│   ├── gpa/                # 成绩 & GPA
│   ├── exams/              # 考试管理
│   ├── goals/              # 每日目标
│   ├── pomodoro/           # 番茄钟
│   ├── running/            # 跑步打卡
│   ├── activity/           # 活动分析（Electron）
│   ├── notes/              # 笔记
│   └── reports/            # 日报 / 周报
├── components/             # UI 组件
│   ├── dashboard/          # 仪表板卡片
│   ├── layout/             # AppShell, SideNav, BottomNav
│   └── ui/                 # 通用组件
├── lib/
│   ├── server-db.ts        # SQLite 数据层（ServerDB 单例）
│   ├── schools/            # 学校适配器注册表
│   │   └── njtech/         # 南京工业大学适配器
│   ├── schedule/           # 课表解析引擎
│   ├── auto-refresh/       # 后台刷新调度状态
│   └── auth/               # 认证生命周期
├── electron/
│   ├── main.js             # 主进程（safeStorage IPC、调度器）
│   ├── preload.js          # 主窗口 contextBridge
│   ├── auto-refresh.js     # 后台刷新调度器
│   └── postbuild.js        # 打包后处理
├── store/                  # Zustand 状态（auth, assignments, theme）
├── hooks/                  # TanStack Query 数据钩子
├── types/                  # TypeScript 类型 & Electron API 声明
└── tests/                  # Vitest 单元测试
```

---

## 安全设计

| 内容 | 方案 |
|------|------|
| 教务密码 | Electron `safeStorage` → DPAPI (Windows) / Keychain (macOS)，明文不落磁盘 |
| 会话凭证 | SQLite `credentials` 表，建议配合系统磁盘加密 |
| Electron 渲染层 | `nodeIntegration: false` + `contextIsolation: true`，全部页面（含宠物窗口）均通过 preload 最小化暴露 |
| 证书校验 | 仅严格后缀匹配 `*.njtech.edu.cn` 信任自签名证书，防止子域名绕过 |
| API 身份校验 | 所有 `/api/*` 接口均校验 Origin 或内部 Token，防止越权访问 |

---

## 开发

```bash
# 类型检查
npm run typecheck

# Lint
npm run lint

# 单元测试
npm test

# 一键三连（typecheck + lint + test）
npm run check
```

CI 在每次 push / PR 时自动运行全部检查（见 `.github/workflows/ci.yml`）。

---

## 接入新学校

1. 在 `lib/schools/` 下新建目录，实现 `SchoolAdapter` 接口（参考 `lib/schools/njtech/`）
2. 在 `lib/schools/registry.ts` 注册适配器
3. 提交 PR，欢迎添加更多学校支持

详细开发指南（含登录协议分析、测试规范、PR 检查清单）见 [docs/school-adapter-guide.md](docs/school-adapter-guide.md)。

没有真实学校账号？用内置的 `mockAdapter` 即可跑通完整流程，见适配器指南的"快速开始"章节。

---

## 贡献

欢迎 Issue 和 PR！请先阅读 [CONTRIBUTING.md](./CONTRIBUTING.md)。

接入新学校教务系统请参考 [docs/school-adapter-guide.md](docs/school-adapter-guide.md)。

安全漏洞请参考 [SECURITY.md](./SECURITY.md) 私信报告，不要直接开 Issue。

数据存储结构和演进计划见 [docs/DATA_MODEL.md](docs/DATA_MODEL.md)。

---

## License

MIT © 2026 [Health-525](https://github.com/Health-525)
