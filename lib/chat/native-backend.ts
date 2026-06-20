import type { ChatBackend, ChatMessage, SendOptions } from "./backend";
import type { ScholarLLMPlugin } from "./scholar-llm-plugin";

let seq = 0;

/**
 * 端侧后端：经 ScholarLLM Capacitor 插件调用原生 MNN 推理，逐 token 流式。
 * 插件由构造函数注入（便于测试）；生产环境传入 registerPlugin 的 ScholarLLM 实例。
 */
export class NativeBackend implements ChatBackend {
  constructor(private readonly plugin: ScholarLLMPlugin) {}

  async send(messages: ChatMessage[], opts: SendOptions = {}): Promise<string> {
    const id = `req-${Date.now().toString(36)}-${++seq}`;

    const handle = await this.plugin.addListener("onToken", (e) => {
      if (e.id === id) opts.onToken?.(e.token);
    });

    const onAbort = () => {
      void this.plugin.stop({ id });
    };
    opts.signal?.addEventListener("abort", onAbort, { once: true });

    try {
      const { text } = await this.plugin.chat({ id, messages });
      return text;
    } finally {
      opts.signal?.removeEventListener("abort", onAbort);
      await handle.remove();
    }
  }
}
