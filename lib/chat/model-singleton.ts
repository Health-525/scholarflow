import { Capacitor } from "@capacitor/core";

import { ModelController, type ModelState } from "./model-controller";
import { ScholarLLM } from "./scholar-llm-plugin";

// 端侧默认模型（Qwen3-0.6B：比 1.7B 更轻，适合 iPhone 15 本地 CPU 推理）。
// 内置到 app bundle 的模型文件夹名必须与此一致。
const MODEL_NAME = "Qwen3-0.6B-MNN";

let controller: ModelController | null = null;
let state: ModelState = { phase: "idle" };
const subscribers = new Set<(s: ModelState) => void>();

function emit(s: ModelState): void {
  state = s;
  subscribers.forEach((fn) => fn(s));
}

function ensureStarted(): void {
  if (controller || !Capacitor.isNativePlatform()) return;
  controller = new ModelController(ScholarLLM, MODEL_NAME, emit);
  void controller.ensureReady();
}

export function getModelState(): ModelState {
  return state;
}

/** 订阅端侧模型状态；首个订阅者触发一次性加载（仅原生平台，模块级去重，避免多个 useChat 实例重复加载）。 */
export function subscribeModel(fn: (s: ModelState) => void): () => void {
  subscribers.add(fn);
  fn(state);
  ensureStarted();
  return () => {
    subscribers.delete(fn);
  };
}

/** 加载失败后重试。 */
export function reloadModel(): void {
  if (!Capacitor.isNativePlatform()) return;
  if (!controller) {
    ensureStarted();
    return;
  }
  void controller.ensureReady();
}
