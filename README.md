<div align="center">
  <br/>
  <img src="public/icons/logo.png" alt="ScholarFlow Logo" width="100" />
  <br/>
  <br/>
  <h1>ScholarFlow</h1>
  <h3>本地优先的校园学习工作台</h3>
  <p>
    教务数据 &nbsp;·&nbsp; 图书馆服务 &nbsp;·&nbsp; 学习工具<br/>
    <strong>一个应用，覆盖你的全部校园学习流程</strong>
  </p>

  <p>
    <a href="https://github.com/Health-525/scholarflow/releases">
      <img src="https://img.shields.io/github/v/release/Health-525/scholarflow?include_prereleases&style=for-the-badge&color=6366f1" alt="Release" />
    </a>
    <a href="https://github.com/Health-525/scholarflow/stargazers">
      <img src="https://img.shields.io/github/stars/Health-525/scholarflow?style=for-the-badge&color=f59e0b" alt="Stars" />
    </a>
    <a href="LICENSE">
      <img src="https://img.shields.io/github/license/Health-525/scholarflow?style=for-the-badge&color=22c55e" alt="License" />
    </a>
    <br/>
    <img src="https://img.shields.io/badge/Node.js-20+-339933?style=flat-square&logo=nodedotjs&logoColor=white" alt="Node.js" />
    <img src="https://img.shields.io/badge/Electron-42-47848F?style=flat-square&logo=electron&logoColor=white" alt="Electron" />
    <img src="https://img.shields.io/badge/Next.js-15-000000?style=flat-square&logo=nextdotjs&logoColor=white" alt="Next.js" />
    <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://github.com/Health-525/scholarflow/actions/workflows/ci.yml/badge.svg" alt="CI" />
  </p>

  <p>
    <a href="https://github.com/Health-525/scholarflow/releases">📥 下载</a>
    &nbsp;·&nbsp;
    <a href="docs/school-adapter-guide.md">📖 学校接入指南</a>
    &nbsp;·&nbsp;
    <a href="https://github.com/Health-525/scholarflow/issues">🐛 问题反馈</a>
    &nbsp;·&nbsp;
    <a href="https://github.com/Health-525/scholarflow/issues">💡 功能建议</a>
  </p>
</div>

---

## 目录

- [什么是 ScholarFlow](#什么是-scholarflow)
- [为什么选择 ScholarFlow](#为什么选择-scholarflow)
- [平台支持](#平台支持)
- [快速开始](#快速开始)
- [功能总览](#功能总览)
- [移动端皮肤](#移动端皮肤)
- [技术栈](#技术栈)
- [学校支持](#学校支持)
- [隐私与安全](#隐私与安全)
- [贡献](#贡献)
- [English](#english)

## 什么是 ScholarFlow

> **ScholarFlow 不是另一个课表 App。** 它是一个将教务系统、图书馆服务和个人学习工具深度融合的本地优先工作台。

大学生的日常信息流是割裂的——教务系统查课表和成绩，图书馆系统抢座位，再用独立的 App 记笔记、设番茄钟、写日报。数据散落在各处，账号密码交给云端，学习节奏被打断。

ScholarFlow 把这些全部收束到一个应用里：

```
教务系统                    图书馆                      个人工具
(课表/考试/成绩)    +    (座位/预约/消息)    +    (作业/笔记/番茄钟/日报)
                              │
                              ▼
                     ScholarFlow 工作台
                    (本地存储 · 离线可用 · 桌面原生)
```

**ScholarFlow 不是爬虫。** 它用你自己的学号密码，通过学校官方 API 登录，只获取你自己的数据。整个过程就像你用浏览器查教务一样，只不过整合到了一个更好用的界面里。数据只存在你的设备上，不经过任何第三方。

**核心理念：** 你的学习数据属于你自己。默认存储在本地 SQLite，凭证加密保存在设备上，不经过任何第三方服务器。

## 为什么选择 ScholarFlow

<table>
  <tr>
    <td width="50%">
      <h4>🔒 数据主权在你手中</h4>
      <p>账号密码仅加密保存在你的设备上，学习数据默认存储在本地 SQLite。<strong>不上传、不追踪、不采集。</strong>代码完全开源，可自行审查。</p>
    </td>
    <td width="50%">
      <h4>🧩 一站式学习闭环</h4>
      <p>课表 → 作业 → 番茄钟 → 日报，不是十个孤立工具的拼凑，而是<strong>围绕真实学习流程设计</strong>的完整工作台。</p>
    </td>
  </tr>
  <tr>
    <td>
      <h4>🖥️ 桌面端原生能力</h4>
      <p>Electron 加持：系统级安全存储、后台自动刷新、活动窗口统计、自动更新。<strong>网页版做不到的事。</strong></p>
    </td>
    <td>
      <h4>🔌 学校即插即用</h4>
      <p><code>SchoolAdapter</code> 接口设计——接入新学校只需实现一个适配器。<strong>已有 NJTech、HEBau 两个真实案例。</strong></p>
    </td>
  </tr>
  <tr>
    <td>
      <h4>📱 三端覆盖</h4>
      <p>桌面端（主力）+ Web/PWA + Android，移动端还有专属<strong>萌系「小咪」皮肤</strong>，M3 设计系统 + 可爱吉祥物。</p>
    </td>
    <td>
      <h4>⚡ 离线可用</h4>
      <p>本地 SQLite + 服务端数据同步到本地。断网也能查课表、写笔记、看成绩。<strong>网络只是增强，不是依赖。</strong></p>
    </td>
  </tr>
</table>

## 平台支持

| 能力 | 🖥️ Electron 桌面 | 🌐 Web / PWA | 📱 Android |
|---|---|---|---|
| 课表 / 成绩 / 考试同步 | ✅ 完整 | ✅ 支持 | ⚡ 实验性 |
| 作业 / 目标 / 番茄钟 / 笔记 | ✅ 完整 | ✅ 支持 | ⚡ 实验性 |
| 图书馆预约与 JWT 刷新 | ✅ 完整 | ⚠️ 浏览器限制 | ⚡ 实验性 |
| 本地安全加密存储 | ✅ 系统级 | ⚠️ 部分 | ⚠️ 部分 |
| AI 学习助手 | ✅ 完整 | ✅ 支持 | ⚡ 实验性 |
| 活动窗口统计 | ✅ 完整 | ❌ 不支持 | ❌ 不支持 |
| 后台自动刷新 | ✅ 完整 | ❌ 不支持 | ❌ 不支持 |
| 萌系小咪皮肤 | 桌面端 UI | 自适应 | 🐱 萌系 UI |

> 桌面版是主力形态，Web / PWA 是补充形态，Android 为实验性支持。

## 快速开始

### 直接使用

前往 [Releases](https://github.com/Health-525/scholarflow/releases) 下载 Windows 安装版或便携版，开箱即用。

### 本地开发

**环境要求：** Node.js 20+ · npm 10+

```bash
git clone https://github.com/Health-525/scholarflow.git && cd scholarflow && npm install
```

| 命令 | 说明 |
|---|---|
| `npm run dev` | 启动 Web 开发服务器 |
| `npm run abi:node && npm run electron:dev` | 启动 Electron 开发环境 |
| `npm run electron:hot:win` | Windows 热加载模式（Next.js + Electron 同时启动） |
| `npm run electron:hot:win` 前可设 `PORT=3002` | 指定 Next.js dev 端口（默认 3000） |
| `npm run typecheck` | TypeScript 类型检查 |
| `npm run lint` | ESLint 代码规范检查 |
| `npm test` | Vitest 单元测试 |
| `npm run check` | 一键全检（typecheck + lint + test） |
| `npm run electron:build` | 构建 Windows 安装包 |

## 功能总览

<table>
  <tr>
    <td width="33%">
      <h4>📊 仪表盘</h4>
      <p>课表、作业、跑步、考试倒计时、教务通知、近期日报——<strong>一屏掌握全部学习状态</strong></p>
    </td>
    <td width="33%">
      <h4>📅 课表</h4>
      <p>今日视图、本周网格、日期查询、学期周次<strong>自动计算</strong></p>
    </td>
    <td width="33%">
      <h4>📝 作业</h4>
      <p>快速新增、列表管理、完成状态<strong>一键追踪</strong></p>
    </td>
  </tr>
  <tr>
    <td>
      <h4>📈 成绩 / GPA</h4>
      <p>教务同步、绩点展示、<strong>按学期查看</strong>成绩趋势</p>
    </td>
    <td>
      <h4>📋 考试</h4>
      <p>考试安排管理与<strong>倒计时提醒</strong></p>
    </td>
    <td>
      <h4>📚 图书馆</h4>
      <p>阅览室实时状态、座位预约、暂离/取消、<strong>馆内消息</strong></p>
    </td>
  </tr>
  <tr>
    <td>
      <h4>📒 笔记</h4>
      <p>Markdown 编辑器、全文搜索、<strong>自动保存</strong></p>
    </td>
    <td>
      <h4>🍅 番茄钟</h4>
      <p>专注 / 休息循环计时，<strong>助你进入心流</strong></p>
    </td>
    <td>
      <h4>🏃 跑步 / 目标</h4>
      <p>习惯打卡与<strong>目标追踪</strong></p>
    </td>
  </tr>
  <tr>
    <td>
      <h4>📰 日报 / 周报</h4>
      <p>学习数据沉淀，<strong>趋势回顾与复盘</strong></p>
    </td>
    <td>
      <h4>🤖 AI 学习助手</h4>
      <p>内置大模型对话，支持<strong>整理笔记、生成小测、检查作业</strong></p>
    </td>
    <td>
      <h4>📱 屏幕时间</h4>
      <p>秒级前台窗口检测，覆盖 90+ 应用分类，未知应用保留真实名称，<strong>支持 CSV 导出</strong></p>
    </td>
  </tr>
</table>

## 移动端皮肤

ScholarFlow 为移动端量身打造了专属的 **「小咪」萌系皮肤**，与桌面端完全隔离：

- **运行时隔离** — 桌面端与移动端 UI 完全独立，互不加载对方代码
- **零开销** — 移动端组件通过 `React.lazy` 懒加载，桌面端打包体积不受影响
- **M3 设计系统** — 粉色 Material-3 主题，支持粉 / 青双配色切换
- **小咪吉祥物** — 专属 Mascot 组件，带流畅动画效果
- **专属页面** — 首页、课表等核心页面均有移动端定制 UI

## 技术栈

<table>
  <tr>
    <th>层级</th>
    <th>技术选型</th>
    <th>说明</th>
  </tr>
  <tr>
    <td>🖥️ 框架</td>
    <td><code>Next.js 15</code> + <code>React 19</code> + <code>TypeScript</code></td>
    <td>App Router · RSC · 类型安全</td>
  </tr>
  <tr>
    <td>🎨 样式</td>
    <td><code>Tailwind CSS</code> + <code>shadcn/ui</code> + <code>Base UI</code></td>
    <td>原子化 CSS · 无头组件 · 暗色模式</td>
  </tr>
  <tr>
    <td>📦 状态</td>
    <td><code>Zustand</code> + <code>TanStack Query</code></td>
    <td>轻量状态 · 服务端缓存 · 自动刷新</td>
  </tr>
  <tr>
    <td>🖥️ 桌面</td>
    <td><code>Electron</code> + <code>better-sqlite3</code></td>
    <td>原生窗口 · 本地数据库 · 安全存储</td>
  </tr>
  <tr>
    <td>📱 移动</td>
    <td><code>Capacitor</code> (Android)</td>
    <td>跨平台 · 原生 API 桥接</td>
  </tr>
  <tr>
    <td>🧪 测试</td>
    <td><code>Vitest</code> + <code>Playwright</code></td>
    <td>单元测试 · E2E · UI 自动化</td>
  </tr>
</table>

## 学校支持

| 适配器 | 学校 | 教务 | 图书馆 | 状态 |
|:---|:---|---|---|:---:|
| `njtech` | 南京工业大学 | ✅ | ✅ | 已支持 |
| `hebau` | 河北农业大学 | ✅ | — | 已支持 |
| `mock` | 本地开发 / 调试 | 🧪 | 🧪 | 测试用 |

> 💡 **想接入你的学校？** 只需实现 `SchoolAdapter` 接口。详见 [学校接入指南 →](docs/school-adapter-guide.md)

## 隐私与安全

```
┌──────────────────────────────────────────────────────────┐
│  🔒 你的数据，你的设备，你的控制权                            │
├──────────────────────────────────────────────────────────┤
│  • 账号密码 AES-256-GCM 加密存储，密钥经 scrypt 派生，不上传  │
│  • 学习数据默认存储在本地 SQLite（WAL 模式）                  │
│  • Electron: contextIsolation + nodeIntegration 严格隔离    │
│  • 内部 API 带 token 校验，图书馆证书显式边界控制             │
│  • 记住密码功能需 Electron safeStorage 才启用                │
│  • 代码完全开源，可自行审查每一行                              │
│  • 零追踪 · 零广告 · 零数据采集                              │
└──────────────────────────────────────────────────────────┘
```

详见 [SECURITY.md](SECURITY.md)

## 贡献

欢迎提 Issue 和 PR。贡献前请阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。

| 文档 | 说明 |
|---|---|
| [学校接入指南](docs/school-adapter-guide.md) | 如何为新学校编写 `SchoolAdapter` |
| [数据模型](docs/DATA_MODEL.md) | 核心数据结构与关系说明 |
| [安全说明](SECURITY.md) | 安全架构设计与最佳实践 |
| [构建排错](docs/BUILD-TROUBLESHOOTING.md) | 常见构建问题与解决方案 |

## 许可

[MIT](LICENSE) © 2026 [Health-525](https://github.com/Health-525)

---

## English

ScholarFlow is a **local-first campus study workspace** that deeply integrates academic systems, library services, and personal study tools into a single desktop application.

**Why ScholarFlow:**
- 🔒 **Data sovereignty** — AES-256-GCM encrypted credentials. Study data in local SQLite. Zero tracking.
- 🧩 **Complete workflow** — Schedule, grades, library, assignments, notes, pomodoro, AI assistant, reports.
- 🖥️ **Desktop-native** — Electron with secure storage, background refresh, activity tracking, auto-update.
- 🔌 **Extensible** — `SchoolAdapter` pattern. NJTech and HEBau already integrated.
- 📱 **Multi-platform** — Desktop (primary), Web/PWA, Android with a unique cute mobile skin.

**Features:** Dashboard · Schedule · Assignments · Exams · GPA · Library (seat reservation) · Notes (Markdown) · Pomodoro · Running/Goals · Daily/Weekly Reports · AI Assistant (OpenRouter/Ollama) · Screen Time (second-level activity tracking with 90+ app categories & CSV export) · Settings · Mobile Ximi Skin

**Platforms:** Electron desktop (full), Web/PWA (complementary), Android/Capacitor (experimental).

**Quick links:** [Downloads](https://github.com/Health-525/scholarflow/releases) · [Security](SECURITY.md) · [Contributing](CONTRIBUTING.md)
