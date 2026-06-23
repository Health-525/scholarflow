// ScholarLLM —— 端侧 MNN 推理的 Capacitor 插件（TS 契约）。
// 原生实现见 native/ios（Phase 3 在 Xcode 内构建），契约对齐 alibaba/MNN 官方
// iOS app 的 LLMInferenceEngineWrapper：
//   load  → Llm::createLLM(config.json) + load()
//   chat  → response()+generate() 逐 token 流式，经 'onToken' 事件回传
import { registerPlugin } from "@capacitor/core";

import type { ChatMessage } from "./backend";

export interface TokenEvent {
  /** 关联本次 chat 请求；串行/并发时只透传本请求的 token。 */
  id: string;
  token: string;
}

export interface ScholarLLMPlugin {
  /** 按 modelName 加载 MNN Llm（原生侧解析为 bundle/沙盒目录的 config.json）。失败 reject。 */
  load(options: { modelName: string }): Promise<void>;
  /** 模型是否已就绪。 */
  isReady(): Promise<{ ready: boolean }>;
  /** 启动一轮流式生成：token 经 'onToken' 事件回传，完成时 resolve 完整文本。 */
  chat(options: { id: string; messages: ChatMessage[] }): Promise<{ text: string }>;
  /** 取消某次生成。 */
  stop(options: { id: string }): Promise<void>;
  addListener(
    eventName: "onToken",
    listener: (event: TokenEvent) => void,
  ): Promise<{ remove: () => Promise<void> }>;
}

/** 生产环境的真实插件实例（原生未实现时，Capacitor 在 Web 自动回退为空实现）。 */
export const ScholarLLM = registerPlugin<ScholarLLMPlugin>("ScholarLLM");
