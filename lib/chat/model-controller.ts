import type { ScholarLLMPlugin } from "./scholar-llm-plugin";

export type ModelPhase = "idle" | "loading" | "ready" | "error";

export interface ModelState {
  phase: ModelPhase;
  error?: string;
}

type Loadable = Pick<ScholarLLMPlugin, "isReady" | "load">;

/**
 * 端侧模型加载生命周期：检查就绪 → 未就绪则 load() → ready；失败 → error。
 * 按 modelName 加载（原生侧解析为 bundle/沙盒目录）；首启下载可作为可选前置步骤后续接入。
 */
export class ModelController {
  private state: ModelState = { phase: "idle" };

  constructor(
    private readonly plugin: Loadable,
    private readonly modelName: string,
    private readonly onChange: (s: ModelState) => void = () => {},
  ) {}

  getState(): ModelState {
    return this.state;
  }

  private set(s: ModelState): void {
    this.state = s;
    this.onChange(s);
  }

  async ensureReady(): Promise<boolean> {
    try {
      const { ready } = await this.plugin.isReady();
      if (ready) {
        this.set({ phase: "ready" });
        return true;
      }
      this.set({ phase: "loading" });
      await this.plugin.load({ modelName: this.modelName });
      this.set({ phase: "ready" });
      return true;
    } catch (e) {
      this.set({ phase: "error", error: e instanceof Error ? e.message : String(e) });
      return false;
    }
  }
}
