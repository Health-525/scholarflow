"use client";

import { Bot, Eye, EyeOff, Key, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SettingsSection } from "@/components/ui/settings-section";
import { showToast } from "@/components/ui/ToastContainer";
import { DEEPSEEK_MODELS, DEFAULT_DEEPSEEK_MODEL } from "@/lib/chat/server-llm";

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
        setModel(data.model || DEFAULT_DEEPSEEK_MODEL);
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
            className="text-primary hover:underline"
          >
            DeepSeek 开放平台
          </a>{" "}
          创建。
        </p>

        <div className="space-y-1.5">
          <label htmlFor="deepseek-api-key" className="text-xs font-medium text-muted-foreground">
            DeepSeek API Key
          </label>
          <div className="relative">
            <Input
              id="deepseek-api-key"
              type={showKey ? "text" : "password"}
              placeholder={configured ? "已保存，输入新 key 可覆盖" : "sk-..."}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="pr-10"
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

        <div className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">模型选择</span>
          <div className="flex flex-wrap gap-2">
            {DEEPSEEK_MODELS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setModel(m.id)}
                className={`rounded-lg px-3 py-2 text-xs font-medium border transition-colors text-left ${
                  model === m.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card hover:bg-secondary text-foreground"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={saving || loading}
          className="w-full gap-1.5"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Key className="size-4" />}
          {saving ? "保存中..." : configured ? "更新配置" : "保存配置"}
        </Button>
      </div>
    </SettingsSection>
  );
}
