# ScholarFlow 端侧 AI 助手设计 — iOS / MNN / Qwen2.5-3B

> 状态：设计稿（待评审）· 日期：2026-06-19 · 适用赛事：**手机上的创意AI · 初赛**

> **开发前置（本地构建 iOS 前先备齐模型）**：大模型不入 git，运行 `npm run mobile:models`
> （即 `scripts/fetch-models.sh`）从魔搭 ModelScope 拉取 Qwen3-1.7B/0.6B-MNN 到 `ios/App/`。依赖 git-lfs。

## 1. 背景与问题

ScholarFlow 的 AI 助手当前后台是 **Ollama 代理**：

```
前端(useChat) → Next.js 路由 /api/chat → 本机 Ollama(localhost:11434) → qwen2.5
```

这是**笔记本/服务器架构**。打包成手机 app 时 `next.config.js` 走 `output: "export"`（静态导出），
**`/api/chat` 这个服务端路由在手机包里根本不存在**，手机里更没有 Ollama —— 端侧零法运行。
全项目也没有任何端侧 LLM 推理代码。

**赛事硬要求**（来自提交表格）：参赛手机型号 / 模型选型+推理框架+端侧适配思路 /
演示视频必须展示「模型本地加载过程 + 推理输入输出 + 核心交互」/ 禁纯 PPT 动效。

## 2. 目标与范围（初赛 MVP）

**目标**：在 **iPhone 15** 上用 **MNN + Qwen2.5-3B** 做**真端侧**推理，复用现有聊天 UI，
能完成「加载模型 → 提问 → 流式作答 → 核心交互」并可录制演示视频。

**In scope**
- iOS 端侧：MNN-LLM 加载 Qwen2.5-3B（4-bit），本地流式推理
- 模型首次启动下载到 app 沙盒、再本地加载（此过程即视频要录的"本地加载"）
- `useChat` 按平台分流：手机走原生 MNN，桌面/开发仍走 Ollama
- 复用现有 `ChatMessage` / `SYSTEM_PROMPT` / 聊天界面（零 UI 改动）

**Out of scope（复赛再议）**：多模态、RAG/知识库接入、ScholarFlow 全功能端侧化、Android 端、模型微调。

## 3. 技术选型（对应表格"模型选型 + 推理框架"）

| 项 | 选择 | 理由 |
|---|---|---|
| 模型 | **Qwen2.5-3B-Instruct**（4-bit, MNN 格式） | 手机端质量/体积/速度最佳平衡；官方已预转换 `taobao-mnn/Qwen2.5-3B-Instruct-MNN`，免自转 |
| 推理框架 | **MNN-LLM**（alibaba/MNN） | 端侧专用引擎；CPU 上 prefill/decode 较 llama.cpp 快约 8.6×/8.9×；官方有 iOS LLM App 参考 |
| 部署 | iPhone 15（A16/A17 Pro，NEON CPU） | 用户参赛机 |
| 分发 | ModelScope 直链（国内友好），HF 备选 | `Qwen2.5-3B-Instruct-MNN` ~1.9GB |

> **SME2 说明**：iPhone 15 **无 SME2**（SME2 自 A19/iPhone 17 起）。本机走通用 NEON CPU。
> SME2 加速路径在用户 **M5 Mac（含 SME2）上实测验证**，作为前瞻性扩展数据写入技术方案，
> 不在 iPhone 15 上声称 SME2 加速。**待核实**：MNN 的 iOS 构建当前是否真正派发 SME2 kernel
> （Apple 可能将 SME 限制在 Accelerate/BNNS），动手前以 MNN iOS 文档为准，再决定加速数字写法。

## 4. 架构（三层，UI 不动）

```
┌─ 前端 (WebView, 不改 UI) ──────────────────────────────┐
│  useChat()  ──►  ChatBackend 接口                       │
│                   ├─ OllamaBackend   (桌面/开发: /api/chat)
│                   └─ NativeBackend   (手机: Capacitor 插件)
└──────────────────────────┬─────────────────────────────┘
                           │ Capacitor 桥
┌──────────────────────────▼─────────────────────────────┐
│  ScholarLLM 原生插件 (iOS, Swift)                        │
│   load(modelDir) / chat(messages,{stream}) / status()   │
│   事件: onToken / onDone / onError                      │
└──────────────────────────┬─────────────────────────────┘
                           │ Obj-C++ 桥
┌──────────────────────────▼─────────────────────────────┐
│  MNN-LLM 运行时 (C++)  Llm::load → response(cb)         │
│   Qwen2.5-3B-Instruct-MNN (4-bit), CPU backend          │
└─────────────────────────────────────────────────────────┘
```

**平台分流**：`useChat` 内 `Capacitor.isNativePlatform()` 选择 backend；接口统一为
`send(messages, onToken) → Promise<fullText>`，对 UI 透明。

**流式数据流**：UI 输入 → `NativeBackend.send` → 插件 `chat()` → MNN `Llm::response` 逐 token 回调
→ 插件 `notifyListeners('onToken')` → `useChat` 累加 `streamingContent` → 渲染。

## 5. 组件分解

1. **ChatBackend 抽象**（`hooks/chat/backend.ts`，新增）
   - 接口：`send(messages, {onToken, signal}) → Promise<string>` / `ready() → boolean`
   - `OllamaBackend`：抽取现有 `/api/chat` 逻辑（行为不变）
   - `NativeBackend`：调 `ScholarLLM` 插件，把 `onToken` 事件转成回调
   - `useChat` 改为依赖抽象，删除对 Ollama 流式格式的硬编码

2. **ScholarLLM Capacitor 插件**（`ios/`，新增原生）
   - `load(modelDir)`：实例化 MNN `Llm`，载入 `config.json`
   - `chat(messages, opts)`：拼 Qwen ChatML 模板，调用 `response` 流式回调
   - `status()`：模型是否就绪、设备信息（供 UI 与降级用）
   - 内存/线程在 native 侧管理，避免阻塞 WebView

3. **MNN iOS 构建产物**
   - 将 MNN 编译为 **xcframework**，开启 `MNN_BUILD_LLM / MNN_LOW_MEMORY / MNN_CPU_WEIGHT_DEQUANT_GEMM / MNN_SUPPORT_TRANSFORMER_FUSE`
   - 链接进 Capacitor iOS 插件 target

4. **模型下载与本地加载 UX**（`app/chat` 复用现有状态位）
   - 首次启动：检测沙盒无模型 → 引导下载（ModelScope）→ 进度条 → 校验 → MNN 加载就绪
   - 现有 `ollamaOnline` 语义泛化为 `modelReady`；离线提示文案复用
   - **此流程即演示视频"模型本地加载过程"的拍摄点**

5. **配置**
   - `.env.example` 修正 `OLLAMA_HOST` → `OLLAMA_URL`（与代码一致），仅作桌面/开发后台
   - 新增 mobile 脚本：`cap add ios` / `cap sync ios` / `cap open ios`

## 6. 错误处理 / 降级

- 模型未下载 / 下载失败：可重试 + 断点续传；不阻断 app 其他功能
- **内存压力（重点）**：3B-4bit ~2GB + WebView 开销。基础版 iPhone 15 仅 **6GB RAM**，iOS 单 app 内存预算偏紧；
  设 **Qwen2.5-1.5B 为兜底**，若真机 OOM 自动/手动降级。15 Pro（8GB）则 3B 稳妥
- 推理：超时、用户取消（`signal`）、异常回退文案
- 桌面无 Ollama：保留现有 503 中文提示

## 7. 测试与验收

- **单测**：ChatBackend 抽象、消息/模板拼装、事件→回调转换
- **真机**：iPhone 15 完成 加载→推理→交互 全链路；记录首 token 延迟 / decode tok/s / 峰值内存
- **M5 基准**：MNN + Qwen2.5-3B 在 M5（SME2）跑 benchmark，产出 SME2 vs NEON 对比数据（技术方案佐证）
- **演示清单**（对齐表格 05）：模型本地加载过程 ✓ / 推理输入输出 ✓ / 核心交互流程 ✓

## 8. 里程碑

1. M5 上跑通 MNN-LLM + Qwen2.5-3B（验证模型 + 框架 + 出基准数据）
2. iOS：MNN xcframework 构建 + 最小推理跑通（`llm_demo` 等价）
3. ScholarLLM 插件：load/chat/流式事件
4. `useChat` 接 ChatBackend 抽象（桌面 Ollama 回归不破）
5. 模型下载/加载 UX
6. iPhone 15 真机联调 + 录制演示视频

## 9. 开放问题

- **SME2 是否赛事硬性门槛**？若是，iPhone 15 不满足，需借 iPhone 17/天玑9500；若为加分项，本方案成立（待用户对实际规则确认）
- **MNN iOS 是否真派发 SME2 kernel**（动手前核实）
- **模型分发渠道**：ModelScope 直链 vs 自托管 CDN（评估国内下载稳定性 / app 首启体验）
- **iPhone 15 变体**：基础版 6GB（3B 偏紧，备 1.5B）/ 15 Pro 8GB（3B 稳）
