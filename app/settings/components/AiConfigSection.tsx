"use client";

import { Bot, Eye, EyeOff, Key, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { SettingsSection } from "@/components/ui/settings-section";
import { showToast } from "@/components/ui/ToastContainer";
import { DEEPSEEK_MODELS, DEFAULT_DEEPSEEK_MODEL } from "@/lib/chat/server-llm";

const MODEL_DESCRIPTIONS: Record<string, string> = {
  "deepseek-v4-pro": "能力最强，适合复杂推理、代码与深度分析",
  "deepseek-v4-flash": "响应更快、性价比高，适合日常对话与轻度任务",
};

export function AiConfigSection() {
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(DEFAULT_DEEPSEEK_MODEL);
  const [configured, setConfigured] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch("/api/settings/ai")
      .then((r) => r.json())
      .then((data: { model?: string; configured?: boolean }) => {
        const savedModel = data.model || DEFAULT_DEEPSEEK_MODEL;
        const validModel = DEEPSEEK_MODELS.some((m) => m.id === savedModel)
          ? savedModel
          : DEFAULT_DEEPSEEK_MODEL;
        setModel(validModel);
        setConfigured(!!data.configured);
      })
      .catch(() => showToast("error", "加载 AI 配置失败"))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey, model }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (res.ok && data.ok) {
        showToast("success", "AI 配置已保存");
        setApiKey("");
        setConfigured(true);
      } else {
        showToast("error", data.error || "保存失败");
      }
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsSection icon={<Bot className="size-4" />} title="AI 助手">
      <div className="space-y-4">
        <p className="text-xs text-muted-foreground leading-relaxed">
          接入 DeepSeek API 后可使用 AI 聊天、自动生成日报/周报。API Key 会在本地加密存储，仅由服务端调用模型时使用。
          没有 Key 可前往{" "}
          <a
            href="https://platform.deepseek.com/api_keys"
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline transition-colors"
          >
            DeepSeek 开放平台
          </a>{" "}
          创建。
        </p>

        <div className="space-y-1.5">
          <label htmlFor="deepseek-api-key" className="text-sm font-medium text-foreground/80">
            DeepSeek API Key
          </label>
          <div className="relative">
            <Input
              id="deepseek-api-key"
              type={showKey ? "text" : "password"}
              placeholder={configured ? "已保存，输入新 key 可覆盖" : "sk-..."}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="pr-10 transition-all duration-200"
            />
            <button
              type="button"
              onClick={() => setShowKey((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showKey ? "隐藏 API Key" : "显示 API Key"}
            >
              {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">留空并保存可清除已保存的 Key。</p>
        </div>

        <div className="space-y-2">
          <span className="text-sm font-medium text-foreground/80">模型选择</span>
          <SegmentedControl
            options={DEEPSEEK_MODELS.map((m) => ({ id: m.id, label: m.label }))}
            value={model}
            onChange={(id) => setModel(id)}
            aria-label="选择 DeepSeek 模型"
          />
          <p className="text-xs text-muted-foreground leading-relaxed">
            {MODEL_DESCRIPTIONS[model]}
          </p>
        </div>

        <Button
          onClick={handleSave}
          disabled={saving || loading}
          variant="outline"
          className="w-full gap-1.5"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Key className="size-4" />}
          {saving ? "保存中..." : configured ? "更新配置" : "保存配置"}
        </Button>
      </div>
    </SettingsSection>
  );
}
