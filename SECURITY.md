# Security Policy

## 支持的版本

| 版本  | 维护状态  |
|-------|-----------|
| 2.x   | ✅ 当前版本 |
| 1.x   | ❌ 不再维护 |

## 报告安全漏洞

请**不要**通过公开 Issue 报告安全漏洞。

发送邮件至仓库维护者的 GitHub 关联邮箱，说明：

- 漏洞类型和影响范围
- 复现步骤（版本、平台、操作）
- 你认为的严重程度

我们承诺：**48 小时内**确认收到报告，**7 个工作日内**给出初步评估和修复计划。

---

## 数据安全矩阵

ScholarFlow 处理以下敏感数据。下表说明每类数据在各平台的存储方式和删除路径。

### 凭证与认证

| 数据 | Electron 桌面端 | Web / PWA | 删除方式 |
|------|-----------------|-----------|---------|
| 教务账号密码（记住密码时） | `safeStorage` → Windows DPAPI / macOS Keychain，加密文件落盘 | **不保存**，仅在内存中临时持有 | 设置页"清除已记住的密码" / 退出登录 |
| 会话 Cookie / Token | SQLite `credentials` 表（明文 JSON） | SQLite `credentials` 表（服务端本地运行） | 退出登录自动清除 |
| 图书馆 JWT | `data/library-jwt.json`（明文） | 同上 | 退出登录或手动删除 |

> **注意**：会话凭证目前明文存储于 SQLite。如果你的设备是多人共用设备，建议启用系统磁盘加密（BitLocker / FileVault）。

### 学习数据

| 数据 | 存储位置 | 是否加密 | 删除方式 |
|------|----------|----------|---------|
| 课表、考试、成绩、作业 | SQLite `data_store`（本地） | 否 | 设置页"清除本地数据" |
| 番茄钟记录、跑步记录 | SQLite `data_store`（本地） | 否 | 同上 |
| 每日目标、笔记、知识库 | `localStorage`（浏览器/WebView） | 否 | 浏览器清除数据 |
| 日报 / 周报 | SQLite `data_store`（本地） | 否 | 同上 |

### 行为与生物特征数据

| 数据 | 采集方式 | 是否落盘 | 说明 |
|------|----------|----------|------|
| 活动窗口标题 / 应用名 | Electron `active-win` 轮询（仅桌面端） | 是，存 SQLite `data_store` | 仅在活动分析页启用后采集；可在设置页清除 |
| 摄像头帧（皱眉检测） | 调用本地 Python Vision Model API | **否，不落盘** | 帧在本地内存推理后立即丢弃，不保存图像 |
| 皱眉评分事件 | 仅记录时间戳和分数 | 是，存 `localStorage` | 不含图像数据 |

> **皱眉检测说明**：摄像头访问需要用户显式授权。推理在本地 Python 进程中完成，结果通过 `http://localhost` 接口返回，不经过任何外部服务器。停止监控后摄像头立即释放。

---

## Electron 安全基线

| 项目 | 状态 | 说明 |
|------|------|------|
| `nodeIntegration` | ✅ 关闭 | 所有渲染窗口（含宠物窗口）均为 `false` |
| `contextIsolation` | ✅ 开启 | 所有渲染窗口均为 `true` |
| Preload 最小权限 | ✅ | 主窗口 `preload.js`、宠物窗口 `pet-preload.js` 分别只暴露各自需要的 IPC 通道 |
| 证书校验 | ✅ 严格后缀匹配 | 仅 `*.njtech.edu.cn` 信任自签名证书，使用 `endsWith` 而非 `includes`，防止子域名绕过 |
| API 身份校验 | ✅ | `/api/auth/remember` 等写操作接口均比对 `findActiveCredentials()` 校验当前登录用户 |
| Content Security Policy | ⚠️ 待加强 | 当前依赖 Next.js 默认，未显式配置 Electron 渲染层 CSP |

---

## 平台安全差异

| 能力 | Electron | Web / PWA |
|------|----------|-----------|
| 密码加密存储 | OS 级（DPAPI / Keychain） | 不保存明文密码 |
| 数据库访问 | 本地 SQLite 文件 | 本地 SQLite 文件（standalone server） |
| 摄像头推理 | 本地 Python 进程 | 不支持 |
| 活动窗口采集 | 本地 `active-win` | 不支持 |

Web / PWA 模式不保存教务密码，仅持有当次登录的内存会话。**建议只在个人设备上使用，不要在公共电脑的浏览器中登录。**

---

## XSS 防护

- 所有用户输入的 Markdown 内容（笔记、日报）通过 **DOMPurify** 清洗后渲染
- 教务系统返回的 HTML 内容（公告）不直接 `innerHTML`，通过解析器提取文本

---

## 依赖安全

```bash
# 检查已知漏洞
npm audit

# 修复可自动修复的问题
npm audit fix
```

Dependabot 已配置（`.github/dependabot.yml`），每周自动提 PR 升级依赖。

---

## 已知局限

1. **SQLite 会话凭证明文**：`credentials` 表中的 cookie/token 当前未加密，依赖系统磁盘加密作为最后一道防线。后续版本计划对 `credential_data` 字段也走 `safeStorage` 加密。
2. **CSP 未显式配置**：Electron 渲染层缺少显式 Content Security Policy，计划在后续版本补齐。
3. **Web 模式无持久凭证保护**：PWA 模式下没有 OS 级密钥链，因此不提供"记住密码"功能。
