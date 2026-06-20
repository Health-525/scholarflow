# 打包问题备忘录

> 记录 ScholarFlow 在构建/打包过程中踩过的坑，方便下次排查。

---

## 2026-06-17：NSIS 安装包最后一步失败

### 现象

- `npm run electron:build:installer` 执行后，**没有生成新的 `ScholarFlow Setup 2.0.3.exe`**。
- `dist/win-unpacked/` 已经完整生成（22:55）。
- `dist/scholarflow-2.0.3-x64.nsis.7z` **残留在目录中**（22:58）。
- 旧的 `ScholarFlow Setup 2.0.3.exe` 时间戳还是 20:48。
- `dist/build-local.log` 是 6 月 16 日的旧日志，没有记录本次失败输出。

### 结论

失败点锁定在 **electron-builder 最后一步：NSIS 安装包生成/签名阶段**。前面的 Next.js 构建、postbuild、asar 打包都正常。

### 解决

复用已生成的 `win-unpacked`，跳过前面耗时步骤，只重跑 NSIS 打包：

```bash
npx electron-builder --win nsis --prepackaged dist/win-unpacked
```

执行后成功生成新的 `dist/ScholarFlow Setup 2.0.3.exe` 和 blockmap。

### 可能原因

1. **旧的 `nsis.7z` 残留导致锁文件/冲突**（先删除再跑就过了，最可能）。
2. 目标 `.exe` 被资源管理器、杀毒软件或上传工具占用。
3. `signtool` 签名临时失败（网络/证书抖动）。

### 预防措施

1. 打包前清理 dist 里的中间产物：

   ```bash
   rm -f dist/*.nsis.7z dist/*.blockmap dist/ScholarFlow*.exe
   npm run release:installer
   ```

2. 打包时把日志持久化，方便事后排查：

   ```bash
   npm run electron:build:installer > dist/build.log 2>&1
   ```

3. 随机失败时检查任务管理器是否有残留进程：
   - `ScholarFlow.exe`
   - `signtool.exe`
   - `makensis.exe`

---

## 快速迭代工作流（避免每次修改都全量打包）

`build-release.ps1` 已支持以下快捷参数，配合 `package.json` 里的 npm script 使用：

| 场景 | 命令 | 说明 |
|------|------|------|
| 日常开发 | `npm run electron:hot:win` | Next.js dev server + Electron 同时启动，前端热重载，修改不用打包 |
| 验证生产目录（最快） | `npm run release:dir` | 跳过检查，只生成 `dist/win-unpacked/`，不生成安装包 |
| 改完前端，快速出安装包 | `npm run release:fast -Target installer` | 跳过检查，正常构建，生成 installer |
| 只改 Electron 主进程/资源 | `npm run release:prebuilt:installer` | 完全复用 `dist/win-unpacked`，只重新打包安装程序 |
| 只改 Electron 主进程/资源 | `npm run release:prebuilt:portable` | 完全复用 `dist/win-unpacked`，只重新打包便携版 |
| 手动复用 win-unpacked | `npx electron-builder --win nsis --prepackaged dist/win-unpacked` | 不经过 ps1，直接 electron-builder |

### 推荐的日常流程

1. **写前端代码**：用 `npm run electron:hot:win`，浏览器/渲染进程自动热重载。
2. **需要测 production 行为**：`npm run release:dir`，十几秒出 `win-unpacked`，双击 `ScholarFlow.exe` 验证。
3. **需要测安装流程**：`npm run release:fast -Target installer`。
4. **只调 Electron 主进程、IPC、自动更新等**：`npm run release:prebuilt:installer`，跳过最慢的 Next.js 构建。
5. **正式发版**：`npm run release`（完整检查 + 构建 + 打包）。

### build-release.ps1 新增参数

- `-SkipCheck`：跳过 typecheck / lint / test。
- `-SkipBuild`：跳过 `npm run build`，复用 `.next/standalone`。
- `-OnlyDir`：只生成 `win-unpacked` 目录，不打包安装程序/便携版。
- `-PrePackaged`：完全复用已有的 `dist/win-unpacked`，跳过构建、postbuild 和 packaging。

---

## 2026-06-17：图书馆消息已读接口

### 发现

NJTECH 图书馆 GraphQL 中，`MessageMutationType` 提供两个相关 mutation：

- `setIndexMsgReaded`：返回 `true`，但**不会**改变 `message.list` 里的 `isread` 字段，只影响首页红点/提示。
- `readed(messageIds: [Int!]!)`：传入 `message_id` 数组，**真正**把消息标记为已读。

### 消息列表字段

`message_id` 不会默认返回，需要显式查询：

```graphql
{ userAuth { message { list(page:1, num:20, type:1) {
  message_id
  title
  content
  create_time
  isread
  isused
}}}}
```

`type`：1 系统通知，2 预约通知，0 全部。

### 标记已读示例

```graphql
mutation { userAuth { message { readed(messageIds: [21039]) } } }
```

返回：

```json
{ "data": { "userAuth": { "message": { "readed": true } } } }
```

### 前端实现

- `GET /api/library/messages`：获取消息（已包含 `message_id`）。
- `POST /api/library/messages`：标记已读。
  - body `{ ids: [21039, ...] }`：标记指定消息。
  - body `{ type }`（不传 ids）：先拉取该类型下所有未读消息，再批量标记。
- 进入消息页自动将所有未读消息同步标记为已读；页面顶部也有"全部已读"按钮。

---
