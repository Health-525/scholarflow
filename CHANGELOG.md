# Changelog

All notable changes to ScholarFlow will be documented in this file.

## [1.0.0] - 2026-06-05

### Added
- 仪表板 Dashboard（5 张卡片：课表/作业/跑步/统计/日报）
- 课表系统（Today View / Week Grid / 课程查询 / 时区感知）
- 作业管理（CRUD + 紧急度分类 + 倒计时）
- 跑步记录（热力图 + 进度统计 + 去重检测）
- 日报/周报阅读器（GitHub Markdown 文件展示）
- 笔记浏览器（文件树 + Markdown 渲染 + WikiLink 解析）
- AI 聊天助手（Ollama 本地 LLM 集成，支持流式响应）
- 番茄钟（专注/休息计时 + 浏览器通知）
- 全局搜索（Fuse.js 模糊搜索 + Ctrl+K 快捷键）
- 数据导出（ICS 日历 + CSV 含 BOM）
- 离线优先架构（IndexedDB 缓存 + 离线变更队列）
- PWA 支持（Service Worker + Manifest + 安装）
- Electron 桌面端（safeStorage Token 加密 + Windows/macOS）
- Paper 纸质感设计系统（亮色/暗色双主题）
- TanStack Query v5 数据同步层
- Zustand 持久化状态管理
- 安全 Token 存储（Electron: DPAPI/Keychain, Web: localStorage）
- DOMPurify XSS 防护
- GitHub API 客户端（缓存 + 限速重试 + 冲突检测）
- ErrorBoundary 全局错误捕获
- CI/CD（GitHub Actions: lint + typecheck + test）
- 贡献指南 + 安全策略 + Issue/PR 模板 + 行为准则

### Fixed
- `getWeekNumber` 时区 Bug：ISO 日期在 Node.js 中被解析为 UTC，现统一使用本地时间
- `utf8ToBase64` 大文件栈溢出：改为分块 8KB 处理
- `globals.css` 重复 `focus-visible` 声明
- `globals.css` 中 `color-mix` 低浏览器兼容性问题
- `layout.tsx` import 顺序混乱 + 无效 HTML 属性
- `repos.ts` 仓库名硬编码 → 支持环境变量覆盖

### Changed
- `schedule.js` 标记为 deprecated（功能已由 generate-timetable.js 覆盖）
- 周次工具函数提取到 `lib/week-utils.js`
- agent 运行时日志加入 .gitignore
- 清理 ~310MB 本地生成产物
