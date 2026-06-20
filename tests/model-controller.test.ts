import { describe, expect, it, vi } from "vitest";

import { ModelController } from "@/lib/chat/model-controller";

// 假插件：只需 isReady / load 两个方法。
function fakePlugin(opts: { ready: boolean; loadFails?: boolean }) {
  return {
    isReady: vi.fn(async () => ({ ready: opts.ready })),
    load: vi.fn(async () => {
      if (opts.loadFails) throw new Error("内存不足(OOM)");
    }),
  };
}

const MODEL = "Qwen2.5-1.5B-Instruct-MNN";

describe("ModelController", () => {
  it("模型未就绪：loading → load() → ready，并按序广播状态", async () => {
    const plugin = fakePlugin({ ready: false });
    const phases: string[] = [];
    const ctrl = new ModelController(plugin, MODEL, (s) => phases.push(s.phase));

    const ok = await ctrl.ensureReady();

    expect(ok).toBe(true);
    expect(plugin.load).toHaveBeenCalledWith({ modelName: MODEL });
    expect(phases).toEqual(["loading", "ready"]);
  });

  it("模型已就绪：跳过 load，直接 ready", async () => {
    const plugin = fakePlugin({ ready: true });
    const ctrl = new ModelController(plugin, MODEL);

    const ok = await ctrl.ensureReady();

    expect(ok).toBe(true);
    expect(plugin.load).not.toHaveBeenCalled();
  });

  it("load 失败 → error 状态（带错误信息）+ 返回 false", async () => {
    const plugin = fakePlugin({ ready: false, loadFails: true });
    const states: { phase: string; error?: string }[] = [];
    const ctrl = new ModelController(plugin, MODEL, (s) => states.push(s));

    const ok = await ctrl.ensureReady();

    expect(ok).toBe(false);
    expect(states.at(-1)?.phase).toBe("error");
    expect(states.at(-1)?.error).toContain("OOM");
  });
});
