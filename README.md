# ScholarFlow

> 面向大学生的本地优先学习中枢，把课表、考试、成绩、图书馆、任务、笔记和周报收进一个桌面应用。

[![CI](https://github.com/Health-525/scholarflow/actions/workflows/ci.yml/badge.svg)](https://github.com/Health-525/scholarflow/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/github/license/Health-525/scholarflow)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)
[![Release](https://img.shields.io/github/v/release/Health-525/scholarflow?include_prereleases)](https://github.com/Health-525/scholarflow/releases)

[下载最新版](https://github.com/Health-525/scholarflow/releases) | [学校接入指南](docs/school-adapter-guide.md) | [提交问题](https://github.com/Health-525/scholarflow/issues/new?template=bug_report.md) | [功能建议](https://github.com/Health-525/scholarflow/issues/new?template=feature_request.md)

## 产品预览
![ScholarFlow Dashboard](docs/dashboard.png)

当前更推荐的使用方式：

- 普通用户：优先下载 Electron 桌面版
- 开发者：优先从源码运行 Web / Electron 开发环境
- 学校扩展贡献者：从 `SchoolAdapter` 架构接入新学校

## 为什么它有价值

大多数校园工具的问题不在于功能少，而在于信息分散。

- 教务系统里有课表、考试、成绩
- 图书馆系统里有座位和消息
- 任务、番茄钟、跑步、日报又散在不同 App
- 很多 SaaS 还要求把账号、日程和学习数据交给第三方服务器

ScholarFlow 的思路很直接：把学生每天真的会切换的这些场景，收束到一个本地优先、离线可用、桌面体验完整的工作台里。

## 适合谁

- 想把校园信息流和个人学习流合并在一起的大学生
- 重视隐私，不愿把教务账号和学习数据托管到第三方云端的用户
- 希望做校园效率产品、学生工具或校内场景产品验证的开发者
- 需要一个可扩展的学校适配器架构来接入更多高校系统的贡献者

## 核心卖点

### 1. 本地优先，不把核心数据交给第三方

- 学习数据默认落到本地 SQLite
- Electron 桌面端通过 `safeStorage` 对敏感凭证做系统级加密
- 支持记住密码，但密码仅用于本地自动刷新，不上传到外部服务
- Web / PWA 形态可运行，但完整的本地安全能力优先为桌面端设计

### 2. 不是单点工具，而是学生日常工作流中枢

ScholarFlow 不是“一个课表 App”或“一个任务 App”，而是把这些模块串起来：

- 课表：今日 / 本周 / 查询三种视图
- 作业：快速录入、状态管理、进度追踪
- 考试与成绩：同步教务数据，展示考试安排和 GPA
- 图书馆：座位、预约状态、消息、JWT 刷新
- 笔记：Markdown 笔记、目录树、搜索、自动保存
- 番茄钟、目标、跑步打卡：覆盖日常自律场景
- 日报 / 周报：把学习记录沉淀为可回顾的复盘材料

### 3. 桌面端体验不是 Web 壳子

Electron 版本包含明确的桌面能力增强：

- 本地安全存储
- 自动更新
- 后台自动刷新调度
- 活动窗口追踪与学习时间统计
- 图书馆登录窗口与凭证刷新流程

这决定了它更接近一个真正可长期使用的学生桌面产品，而不是简单套壳网页。

### 4. 对开发者友好，能继续接学校

项目把学校接入抽象成 `SchoolAdapter`。

- 当前内置：`njtech`、`mock`
- 新学校接入时，核心业务层不需要整体改写
- 适合持续扩充为多学校支持的校园效率平台

## 功能总览

| 模块 | 当前能力 |
| --- | --- |
| 仪表盘 | 汇总课表、作业、跑步、考试倒计时、教务通知、最近日报 |
| 课表 | 今日视图、本周网格、日期查询、学期周次计算 |
| 作业 | 快速新增、列表管理、完成状态追踪 |
| 考试 | 考试安排查看与管理 |
| 成绩 / GPA | 教务同步、绩点展示、按学期查看 |
| 图书馆 | 阅览室状态、预约、暂离、取消预约、馆内消息 |
| 笔记 | Markdown、搜索、自动保存、示例笔记 |
| 番茄钟 | 专注 / 休息循环计时 |
| 目标 / 跑步 | 习惯与目标追踪 |
| 日报 / 周报 | 学习数据沉淀与趋势复盘 |
| 设置 | 主题、数据导出、刷新策略、账户与设备信息 |

## 平台支持

| 能力 | Electron 桌面端 | Web / PWA | Android / Capacitor |
| --- | --- | --- | --- |
| 课表 / 成绩 / 考试同步 | 支持 | 支持 | 实验性 |
| 作业 / 目标 / 番茄钟 / 笔记 | 支持 | 支持 | 实验性 |
| 图书馆预约与 JWT 刷新 | 支持更完整 | 受浏览器限制 | 实验性 |
| 本地安全加密存储 | 支持 | 不完整 | 不完整 |
| 活动窗口统计 | 支持 | 不支持 | 不支持 |
| 后台自动刷新 | 支持 | 不支持 | 不支持 |

结论很明确：桌面版是主形态，Web / PWA 是补充形态。

## 项目定位

如果从产品角度看，ScholarFlow 更像下面三类产品的交叉：

- 校园信息聚合器
- 本地优先的学生效率系统
- 可扩展的高校系统适配平台

这也是它相对通用待办工具、云端笔记工具、单点校园插件的差异化所在。

## 技术方案

- `Next.js 15` + `React 19` + `TypeScript`
- `Tailwind CSS` + `shadcn/ui` + `Base UI`
- `Zustand` + `TanStack Query`
- `Electron` + `better-sqlite3`
- `Capacitor` Android
- `Vitest` + `Playwright`

关键实现策略：

- 本地 SQLite 持久化，避免对外部数据库形成强依赖
- School Adapter 抽象学校接入层，降低多校扩展成本
- Electron 主进程承接安全存储、更新、后台刷新等桌面能力
- Web、PWA、桌面端共享主要前端代码，减少重复实现

## 快速开始

### 直接使用

前往 [Releases](https://github.com/Health-525/scholarflow/releases) 下载 Windows 安装版或便携版。

### 本地开发

要求：

- Node.js 20+
- npm 10+

```bash
git clone https://github.com/Health-525/scholarflow.git
cd scholarflow
npm install
```

启动 Web 开发环境：

```bash
npm run dev
```

启动 Electron 开发环境：

```bash
npm run abi:node
npm run electron:dev
```

常用检查：

```bash
npm run typecheck
npm run lint
npm test
npm run check
```

### 打包发布

```bash
npm run electron:build
```

或分别生成：

```bash
npm run electron:build:portable
npm run electron:build:installer
```

## 环境变量

当前公开示例仅包含可选项：

```bash
# Ollama 服务地址，可选，默认 http://localhost:11434
# OLLAMA_HOST=http://localhost:11434
```

## 当前学校支持

- `njtech`：南京工业大学
- `mock`：用于本地开发和适配器调试

如果你想接入新的学校系统，请阅读 [docs/school-adapter-guide.md](docs/school-adapter-guide.md)。

## 为什么这个 README 这样组织

这版结构遵循了高 star 产品型仓库常见做法：

- 首屏先给一句产品定位，而不是先铺技术细节
- 只保留一张主截图，避免截图墙分散注意力
- 把下载、文档、问题反馈放在首屏附近，降低转化阻力
- 功能、平台支持、安装、贡献按用户决策顺序往下排
- 开发细节保留，但不抢占产品价值表达

## 项目结构

```text
scholarflow/
├─ app/                # Next.js App Router 页面与 API
├─ components/         # 共享 UI 组件
├─ electron/           # Electron 主进程与桌面能力
├─ hooks/              # 查询与业务 hooks
├─ lib/                # 核心业务逻辑、School Adapter、SQLite 层
├─ store/              # Zustand 状态
├─ tests/              # Vitest 测试
├─ e2e/                # Playwright 测试
├─ docs/               # 架构与接入文档
└─ screenshots/        # README 截图素材
```

## 安全说明

- 敏感凭证优先走桌面端系统级加密存储
- Electron 使用 `contextIsolation: true`、`nodeIntegration: false`
- 内部 API 调用带内部 token 校验
- 图书馆登录与证书信任逻辑做了显式边界控制

更完整的安全说明见 [SECURITY.md](SECURITY.md)。

## 贡献

欢迎 Issue 和 PR。

- 开发规范：见 [CONTRIBUTING.md](CONTRIBUTING.md)
- 学校接入：见 [docs/school-adapter-guide.md](docs/school-adapter-guide.md)
- 数据模型：见 [docs/DATA_MODEL.md](docs/DATA_MODEL.md)
- 安全问题：见 [SECURITY.md](SECURITY.md)

## License

MIT © 2026 [Health-525](https://github.com/Health-525)
