# 端侧 Qwen 落地 iPhone · 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: 用 superpowers:subagent-driven-development 或 superpowers:executing-plans 逐任务执行。步骤用 `- [ ]` 勾选跟踪。

**Goal:** 让 ScholarFlow 的 AI 助手用 MNN 在 iPhone 15 本地、离线运行 Qwen2.5-3B，可演示「模型本地加载 → 流式问答 → 核心交互」。

**Architecture:** 前端 `useChat` 抽象出 `ChatBackend`（Web/桌面走 OpenRouter/Ollama；iOS 走原生）→ `ScholarLLM` Capacitor 插件 → MNN-LLM C++ 运行时加载 Qwen2.5-3B(.mnn, 4-bit)，CPU 推理、流式逐 token。

**Tech Stack:** MNN / MNN-LLM (C++)、Capacitor iOS 插件 (Swift + Obj-C++)、Next.js 静态导出 + Capacitor、TypeScript/React 前端、`taobao-mnn/Qwen2.5-3B-Instruct-MNN`。

## Global Constraints
- 模型：Qwen2.5-3B-Instruct，**4-bit (MNN 格式)**，源 `taobao-mnn/Qwen2.5-3B-Instruct-MNN`（**ModelScope 优先**，国内快）
- 推理：**MNN-LLM**、**CPU 后端**、**禁云 API、禁 NPU**、**离线可用**
- 目标机：**iPhone 15**（A16/A17 Pro，NEON；3B 内存偏紧时降级 1.5B）
- 性能数字：**真机实测回填，不编造**
- 原型机：**M5 Mac**（含 SME2），先在它上面验证
- 网络：GitHub 慢 → 可用 Gitee 镜像；模型走 ModelScope

---

### Phase 0 — M5 验证 spike（先证明模型 + 框架能跑）

**目标：** 在 M5 上用 MNN 跑通 Qwen2.5-3B，拿到基线数字。**不碰 iOS。**
**Files:** 独立目录 `~/mnn-spike`（不进仓库）

- [ ] **装工具链**：`xcode-select --install`；`brew install cmake git-lfs`
- [ ] **下载模型（ModelScope）**：`git lfs install && git clone https://www.modelscope.cn/taobao-mnn/Qwen2.5-3B-Instruct-MNN.git`
- [ ] **拉 MNN**：`git clone https://github.com/alibaba/MNN`（慢则换 Gitee 镜像）
- [ ] **编译 MNN-LLM**：
  ```bash
  cd MNN && mkdir build && cd build
  cmake .. -DMNN_BUILD_LLM=ON -DMNN_LOW_MEMORY=ON \
    -DMNN_CPU_WEIGHT_DEQUANT_GEMM=ON -DMNN_SUPPORT_TRANSFORMER_FUSE=ON \
    -DMNN_BUILD_TOOLS=ON
  make -j8
  ```
- [ ] **跑 llm_demo**：`./llm_demo /path/Qwen2.5-3B-Instruct-MNN/config.json`，输入一道中文题（如"用通俗例子讲梯度下降"）
- [ ] **记录基线**：能否中文作答、decode tok/s、峰值内存

**Deliverable:** ✅ MNN + Qwen2.5-3B 在 M5 跑通 + 基线数字。**这步过不了 → 整条路要重评，先解决再继续。**

---

### Phase 1 — iOS 端侧推理跑通（最高风险，前置打掉）

**目标：** 让 Qwen2.5-3B 在 **iPhone 15 真机**上原生跑起来（先不接 ScholarFlow），并**钉死 MNN 的 iOS 集成方式与 API**，供 Phase 3 消费。
**前置：** Xcode、iPhone 15、**免费 Apple ID**（无需付费开发者账号；自由签名 7 天有效期，录 demo 足够）

- [ ] 拉官方 **MNN iOS LLM Demo**（MNN repo `project/ios` / apps 下的 iOS LLM app），Xcode 打开
- [ ] iPhone 15 真机 build & run，加载 Qwen2.5-3B，确认本地推理成功（同时验证设备可行性 + 内存够不够 3B）
- [ ] 从 demo 源码**提取并记录**：MNN 如何编进 iOS（xcframework / 源码 / podspec）、`Llm` 加载 API、流式回调 API、线程模型
- [ ] 把上述写进本文件「Phase 1 产出」节

**Interfaces produced（Phase 3 依赖，Phase 1 填实）：** `MNNLlm.load(configPath)` / `MNNLlm.generate(prompt, onToken)` 的**真实 Swift 签名**
**Deliverable:** ✅ Qwen2.5-3B 在 iPhone 15 真机本地推理成功 + 已知 iOS 集成 API。**这是最大不确定性，必须先打掉再往下。**

---

### Phase 2 — ChatBackend 抽象（TypeScript，TDD）

**目标：** 把 `useChat` 解耦成可插拔后台，Web/桌面回归不破，为接原生铺路。
**Files:** Create `hooks/chat/backend.ts`、`hooks/chat/backend.test.ts`；Modify `hooks/useChat.ts`

- [ ] **写失败测试**（backend 选择 + 消息组装）→ 运行确认失败
- [ ] **实现** `ChatBackend` 接口 + `OpenRouterBackend`/`OllamaBackend`（把现有 `/api/chat` 逻辑抽进来）→ 运行测试通过
- [ ] **改 `useChat`** 依赖 `ChatBackend`；跑现有测试 + 手测 Web 聊天仍正常
- [ ] **commit**

**Interfaces produced：** `interface ChatBackend { send(messages, {onToken, signal}): Promise<string>; ready(): boolean }`
**Deliverable:** ✅ 前端后台可插拔，Web 回归通过。

---

### Phase 3 — ScholarLLM Capacitor 插件（原生桥）

**目标：** 把 Phase 1 的 iOS MNN 推理封成 Capacitor 插件，JS 可调。
**Files:** `npx cap add ios`（生成 `ios/`）；Create Swift 插件 + TS 定义

- [ ] `cap add ios`，把 MNN（Phase 1 的 xcframework）链进插件 target
- [ ] **写 Swift 插件** `ScholarLLMPlugin`：`load(modelDir)` / `chat(messages,{stream})` → `notifyListeners('onToken'|'onDone'|'onError')`（用 Phase 1 钉死的 MNN API）
- [ ] **写 TS 端**定义 + `registerPlugin('ScholarLLM')`
- [ ] 最小页面手测：JS 调 `chat`，收到流式 token
- [ ] **commit**

**Interfaces produced（Phase 4 依赖）：** `ScholarLLM.load(dir)` / `ScholarLLM.chat({messages})` + `addListener('onToken', cb)`
**Deliverable:** ✅ JS 经插件拿到端侧流式推理。

---

### Phase 4 — NativeBackend 接入 + 模型下载 UX

**目标：** 把插件接进 ChatBackend，加首启下载 + 本地加载，手机聊天全离线。
**Files:** Create `hooks/chat/native-backend.ts`、模型下载/加载状态组件；Modify `app/chat`

- [ ] `NativeBackend implements ChatBackend`：把 `ScholarLLM` 事件转成 `onToken` 回调
- [ ] 平台分流：`Capacitor.isNativePlatform()` → `NativeBackend`，否则 Phase 2 的云/Ollama 后台
- [ ] **首启下载**（ModelScope）到 App 沙盒 + 校验 + MNN 加载 + 进度 UI（这就是"模型本地加载"演示点）
- [ ] 内存兜底：3B OOM → 提示并降级 1.5B
- [ ] **commit**

**Deliverable:** ✅ iPhone 上 ScholarFlow 聊天 = 端侧 Qwen2.5-3B，全程离线。

---

### Phase 5 — 真机联调 + demo + 回填性能

**目标：** 产出比赛交付物。

- [ ] iPhone 15 真机全链路：加载 → 问答 → 核心交互
- [ ] **飞行模式**验证离线
- [ ] 录演示视频（本地加载 / 推理 I/O / 核心交互；禁 PPT）
- [ ] 实测 首 token 延迟 / decode tok/s / 峰值内存 → **回填** 04 文档 + HTML 的"实测中"
- [ ] M5 出 NEON vs SME2 基准（前瞻叙事佐证）

**Deliverable:** ✅ 比赛可交付的端侧 demo + 真实数字。

---

## Self-Review
- **Spec 覆盖**：架构 / 选型 / 分发 / 端侧适配 / SME2 / MVP / 测试 均有对应 Phase ✓
- **风险前置**：Phase 0/1 先打掉"模型能否在设备上跑"的最大不确定性 ✓
- **诚实**：native API 由 Phase 1 钉死后供后续消费，不预先编造 Swift 签名 ✓
- **依赖链**：P0→P1（验证）；P2 独立可并行；P1+P2→P3→P4→P5 ✓
