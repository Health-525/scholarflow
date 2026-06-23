import { describe, expect, it, vi } from "vitest";

import { NativeBackend } from "@/lib/chat/native-backend";
import type { ScholarLLMPlugin, TokenEvent } from "@/lib/chat/scholar-llm-plugin";

// 假插件：chat() 触发一串 onToken 事件后 resolve 完整文本（模拟原生 MNN 流式回传）。
function fakePlugin(tokens: string[]) {
  let listener: ((e: TokenEvent) => void) | undefined;
  const remove = vi.fn(async () => {
    listener = undefined;
  });
  const plugin: ScholarLLMPlugin = {
    load: vi.fn(async () => {}),
    isReady: vi.fn(async () => ({ ready: true })),
    stop: vi.fn(async () => {}),
    addListener: vi.fn(async (_event, cb) => {
      listener = cb as (e: TokenEvent) => void;
      return { remove };
    }),
    chat: vi.fn(async ({ id }) => {
      for (const t of tokens) listener?.({ id, token: t });
      return { text: tokens.join("") };
    }),
  };
  return { plugin, remove };
}

describe("NativeBackend", () => {
  it("把插件 onToken 事件转成 onToken 回调并返回完整文本", async () => {
    const { plugin } = fakePlugin(["端", "侧", "推", "理"]);
    const backend = new NativeBackend(plugin);
    const got: string[] = [];
    const full = await backend.send(
      [{ role: "user", content: "hi" }],
      { onToken: (d) => got.push(d) },
    );
    expect(full).toBe("端侧推理");
    expect(got).toEqual(["端", "侧", "推", "理"]);
  });

  it("生成结束后移除事件监听（防泄漏）", async () => {
    const { plugin, remove } = fakePlugin(["x"]);
    await new NativeBackend(plugin).send([{ role: "user", content: "hi" }]);
    expect(remove).toHaveBeenCalledOnce();
  });
});
