# ScholarLLM —— iOS 端侧 MNN 集成（Xcode 侧）

把 ScholarFlow 的 AI 助手接到 **端侧 MNN**（iPhone 本地 CPU 跑 Qwen）。
TS 侧已全部接好（`lib/chat/native-backend.ts` + `model-controller.ts` + `useChat` 平台分流），
**这里是需要你在 Xcode 内完成的原生部分**。步骤对照 `alibaba/MNN` 官方文档
（`apps/iOS/MNNLLMChat/README-ZH.md` + `transformers/llm/engine/ios/README.md`）。

## 架构回顾

```
useChat (WebView, JS) → NativeBackend → ScholarLLM 插件(registerPlugin)
  ── Capacitor 桥 ──► ScholarLLMPlugin.swift → ScholarLLMEngine.{h,mm}(ObjC++) → MNN-LLM C++ → Qwen .mnn
```

## 前置：你已经有的东西
你已经能 build 跑通官方 **MNNLLMChat**（模型就在它上面跑）→ 你本机已有 **编好的 `MNN.framework`**。
本插件的 `ScholarLLMEngine.mm` 就是把官方 `LLMInferenceEngineWrapper.mm` 裁成"纯文本对话"。

---

## Step 1 —— 拿到 `MNN.framework`（二选一）

**A. 复用（最省事，推荐）**：从你能跑的 MNNLLMChat 工程里直接拷
```bash
# 在你 clone 的 MNN 仓库里，framework 在 app 目录下
cp -R apps/iOS/MNNLLMChat/MNN.framework ~/scholarflow/native/ios/MNN.framework
```

**B. 重新编（纯文本最小依赖，体积更小）**：MNN 根目录执行
```bash
sh package_scripts/ios/buildiOS.sh "-DMNN_ARM82=ON -DMNN_LOW_MEMORY=ON \
  -DMNN_SUPPORT_TRANSFORMER_FUSE=ON -DMNN_BUILD_LLM=ON \
  -DMNN_CPU_WEIGHT_DEQUANT_GEMM=ON -DMNN_SEP_BUILD=OFF"
# 产物：MNN-iOS-CPU-GPU/Static/MNN.framework
cp -R MNN-iOS-CPU-GPU/Static/MNN.framework ~/scholarflow/native/ios/MNN.framework
```

## Step 2 —— 给 ScholarFlow 加 iOS 工程
```bash
cd ~/scholarflow
npm i -D @capacitor/ios
npm run build          # next build → 静态导出到 out/
npx cap add ios        # 生成 ios/App 原生工程
npx cap sync ios
open ios/App/App.xcworkspace
```

## Step 3 —— 把 framework + 3 个插件文件塞进 App target
1. 拷 framework 到工程里：`cp -R native/ios/MNN.framework ios/App/`
2. Xcode 里选中 **App** target → **General** → *Frameworks, Libraries, and Embedded Content* → `+` 加 `MNN.framework`，**Embed = Do Not Embed**（静态 framework）。
3. 把 `native/ios/ScholarLLM/` 的 3 个文件拖进 App target（勾 *Copy items if needed* + *Add to targets: App*）：
   `ScholarLLMEngine.h`、`ScholarLLMEngine.mm`、`ScholarLLMPlugin.swift`

## Step 4 —— Bridging Header（让 Swift 看到 ObjC++ 引擎）
1. 新建 `ios/App/App/App-Bridging-Header.h`，内容：
   ```objc
   #import "ScholarLLMEngine.h"
   ```
2. **Build Settings** → *Objective-C Bridging Header* = `App/App-Bridging-Header.h`

## Step 5 —— Build Settings（对齐官方）
- `CLANG_CXX_LANGUAGE_STANDARD` = **`gnu++20`**
- `CLANG_CXX_LIBRARY` = **`libc++`**
- `FRAMEWORK_SEARCH_PATHS` += `$(PROJECT_DIR)`（MNN.framework 所在目录）
- **VERIFY**：若 `ScholarLLMEngine.mm` 顶部 `#include <llm/llm.hpp>` 报找不到 →
  把 `HEADER_SEARCH_PATHS` 指到 `MNN.framework/Headers`，或把 include 改成
  `#import <MNN/llm/llm.hpp>` 一类（对照 MNN.framework 里头文件实际布局）。

## Step 6 —— 放模型（先用小模型跑通）
- 从 ModelScope `taobao-mnn` 下个小的：**Qwen2.5-1.5B-Instruct-MNN** 或 **Qwen3-1.7B-MNN**
  （含 `config.json` + `llm.mnn` + tokenizer 等整个文件夹）。
- 初赛先**内置进 bundle**（最简单）：把模型文件夹拖进 Xcode 工程，**文件夹名 = modelName**
  （如 `Qwen2.5-1.5B-Instruct-MNN`，与 `lib/chat/model-singleton.ts` 的默认值一致；类似官方 `LocalModel`）。
- TS 侧调 `ScholarLLM.load({ modelName })`，Swift 用 `Bundle.main.path(forResource: modelName)` 解析成目录。
  改成首启下载到沙盒时，只改 Swift 里这段路径解析即可。

## Step 7 —— 签名 + 真机
- **Signing & Capabilities** → *Team* 填你的 Apple ID（免费账号即可，自由签名 7 天，录 demo 够）；
  *Bundle Identifier* = `com.health525.scholarflow`。
- 连 iPhone 15，手机端打开**开发者模式**；build & run。
- 装好后：**设置 → 通用 → VPN与设备管理** → 信任你的账号。

## Step 8 —— 验证
- 打开 AI 助手页 → 应自动走 `NativeBackend` → 端侧流式出字。
- **插件没注册**？Capacitor 8 对 `CAPBridgedPlugin` 自动发现；若 JS 报 `ScholarLLM` 未实现，
  检查 `ScholarLLMPlugin.swift` 是否进了 App target、`@objc(ScholarLLMPlugin)` + `jsName="ScholarLLM"` 是否在。
- 卡住把 Xcode 报错贴我。

## 上真机要验证的点（device-only）
- [ ] `#include` 路径通、能 `createLLM`+`load`
- [ ] 流式 token 正常、中文正常
- [ ] **多轮对话**：`ScholarLLMEngine.mm` 现为每轮 `reset()` + 整段 history 重新 prefill；确认上下文正确
- [ ] `<eop>` 结束符对 Qwen 是否合适（否则以 `stoped()` 为准）
- [ ] 峰值内存：iPhone 15(6GB) 跑 3B 偏紧 → 官方建议 **7B 及以下**；稳妥用 1.5B/1.7B

## 性能参考（官方文档，**你要测自己的真实数**，别照抄）
- iPhone 15 Pro · Qwen2-1.5B-instruct 4bit：prefill ~107 tok/s，decode ~25.6 tok/s
- iPhone 15 Pro · Qwen2-0.5B 4bit：decode ~51 tok/s
