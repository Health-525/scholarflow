"use client";

import { Dialog } from "@base-ui/react/dialog";
import { Download, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { exportWechatHtml } from "@/lib/notes/export-import";
import { fetchCodeBlockThemeCss, renderWechatPreviewHtml } from "@/lib/notes/wechat-renderer";
import {
  COLOR_OPTIONS,
  CODE_BLOCK_THEMES,
  defaultWechatStyleConfig,
  FONT_FAMILY_OPTIONS,
  FONT_SIZE_OPTIONS,
  HEADING_LEVEL_OPTIONS,
  HEADING_STYLE_OPTIONS,
  WECHAT_THEMES,
  type HeadingLevel,
  type HeadingStyleType,
  type WechatStyleConfig,
} from "@/lib/notes/wechat-themes";
import { cn } from "@/lib/utils";

const DEFAULT_HEADING_LEVEL: HeadingLevel = "h2";

const SETTINGS_STORAGE_KEY = "scholarflow:wechat-export-settings";

interface WechatPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  content: string;
}

function loadStoredConfig(): WechatStyleConfig {
  if (typeof window === "undefined") return defaultWechatStyleConfig();
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<WechatStyleConfig>;
      return { ...defaultWechatStyleConfig(), ...parsed };
    }
  } catch {
    // ignore
  }
  return defaultWechatStyleConfig();
}

function saveStoredConfig(config: WechatStyleConfig) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(config));
  } catch {
    // ignore
  }
}

function Switch({
  checked,
  onCheckedChange,
  id,
  label,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  id?: string;
  label?: string;
}) {
  return (
    <label
      htmlFor={id}
      aria-label={label || "切换"}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors",
        checked ? "bg-primary" : "bg-muted-foreground/30"
      )}
    >
      <input
        id={id}
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={(e) => onCheckedChange(e.target.checked)}
      />
      <span
        className={cn(
          "inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform",
          checked ? "translate-x-[18px]" : "translate-x-1"
        )}
      />
    </label>
  );
}

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-medium text-muted-foreground">{title}</h3>
      {children}
    </div>
  );
}

export function WechatPreviewDialog({ open, onOpenChange, title, content }: WechatPreviewDialogProps) {
  const [config, setConfig] = useState<WechatStyleConfig>(defaultWechatStyleConfig());
  const [srcDoc, setSrcDoc] = useState<string>("");
  const [codeThemeCss, setCodeThemeCss] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [selectedHeadingLevel, setSelectedHeadingLevel] = useState<HeadingLevel>(DEFAULT_HEADING_LEVEL);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    setConfig(loadStoredConfig());
  }, [open]);

  useEffect(() => {
    saveStoredConfig(config);
  }, [config]);

  useEffect(() => {
    let cancelled = false;
    fetchCodeBlockThemeCss(config.codeBlockTheme).then((css) => {
      if (!cancelled) setCodeThemeCss(css);
    });
    return () => {
      cancelled = true;
    };
  }, [config.codeBlockTheme]);

  const updatePreview = useCallback(async () => {
    const html = await renderWechatPreviewHtml({
      title,
      content,
      config,
      inlineCodeThemeCss: codeThemeCss,
    });
    setSrcDoc(html);
  }, [title, content, config, codeThemeCss]);

  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      void updatePreview();
    }, 150);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [open, updatePreview]);

  function updateConfig<K extends keyof WechatStyleConfig>(key: K, value: WechatStyleConfig[K]) {
    setConfig((prev: WechatStyleConfig) => ({ ...prev, [key]: value }));
  }

  const updateHeadingStyle = useCallback((level: HeadingLevel, style: HeadingStyleType) => {
    setConfig((prev: WechatStyleConfig) => {
      const next = { ...prev.headingStyles };
      if (style === "default") {
        delete next[level];
      } else {
        next[level] = style;
      }
      return { ...prev, headingStyles: next };
    });
  }, []);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      await exportWechatHtml(title, content, config);
    } finally {
      setExporting(false);
    }
  }, [title, content, config]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 dark:bg-black/60 backdrop-blur-sm data-[open]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[open]:fade-in-0" />
        <Dialog.Popup
          className={cn(
            "fixed inset-3 z-50 flex flex-col overflow-hidden rounded-2xl bg-card shadow-xl ring-1 ring-border outline-none",
            "md:left-1/2 md:top-1/2 md:h-[calc(100vh-4rem)] md:max-h-[900px] md:w-[calc(100vw-4rem)] md:max-w-6xl md:-translate-x-1/2 md:-translate-y-1/2",
            "data-[open]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[open]:fade-in-0 data-[closed]:zoom-out-95 data-[open]:zoom-in-95"
          )}
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3 md:px-5">
            <Dialog.Title className="text-base font-semibold font-display text-foreground">
              公众号文章预览
            </Dialog.Title>
            <Dialog.Close render={<Button size="icon" variant="ghost" className="h-8 w-8" />}>
              <X className="w-4 h-4" />
            </Dialog.Close>
          </div>

          <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
            {/* Preview */}
            <div className="relative flex min-h-[40vh] flex-1 flex-col overflow-hidden bg-muted">
              <iframe
                title="公众号预览"
                srcDoc={srcDoc}
                className="h-full w-full border-0"
                sandbox="allow-same-origin"
              />
            </div>

            {/* Settings */}
            <div className="flex w-full shrink-0 flex-col border-t border-border bg-card md:w-80 md:border-t-0 md:border-l">
              <div className="flex-1 space-y-5 overflow-y-auto p-4 md:p-5">
                <SettingsSection title="主题">
                  <div className="grid grid-cols-3 gap-2">
                    {WECHAT_THEMES.map((theme) => (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => updateConfig("theme", theme.id)}
                        className={cn(
                          "rounded-lg border px-2 py-1.5 text-left text-xs transition-colors",
                          config.theme === theme.id
                            ? "border-primary bg-primary/5 text-foreground"
                            : "border-border bg-background text-muted-foreground hover:bg-muted"
                        )}
                      >
                        <span className="block font-medium text-foreground">{theme.name}</span>
                        {theme.description && (
                          <span className="block mt-0.5 truncate text-[10px] leading-tight opacity-70">
                            {theme.description}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </SettingsSection>

                <SettingsSection title="字体">
                  <div className="grid grid-cols-3 gap-2">
                    {FONT_FAMILY_OPTIONS.map((opt) => (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => updateConfig("fontFamily", opt.value)}
                        className={cn(
                          "rounded-lg border px-2 py-1.5 text-xs transition-colors",
                          config.fontFamily === opt.value
                            ? "border-primary bg-primary/5 text-foreground"
                            : "border-border bg-background text-muted-foreground hover:bg-muted"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </SettingsSection>

                <SettingsSection title="字号">
                  <div className="grid grid-cols-5 gap-1.5">
                    {FONT_SIZE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => updateConfig("fontSize", opt.value)}
                        title={opt.desc}
                        className={cn(
                          "rounded-md border px-1 py-1.5 text-xs transition-colors",
                          config.fontSize === opt.value
                            ? "border-primary bg-primary/5 text-foreground"
                            : "border-border bg-background text-muted-foreground hover:bg-muted"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </SettingsSection>

                <SettingsSection title="主题色">
                  <div className="grid grid-cols-4 gap-2">
                    {COLOR_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => updateConfig("primaryColor", opt.value)}
                        className={cn(
                          "flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs transition-colors",
                          config.primaryColor === opt.value
                            ? "border-primary bg-primary/5"
                            : "border-border bg-background hover:bg-muted"
                        )}
                      >
                        <span
                          className="h-4 w-4 rounded-full border border-black/5 shrink-0"
                          style={{ background: opt.value }}
                        />
                        <span className="truncate">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-xs text-muted-foreground">自定义</span>
                    <input
                      type="color"
                      value={config.primaryColor}
                      onChange={(e) => updateConfig("primaryColor", e.target.value)}
                      className="h-8 w-12 cursor-pointer rounded border border-border bg-transparent p-0.5"
                    />
                    <code className="text-xs text-muted-foreground">{config.primaryColor}</code>
                  </div>
                </SettingsSection>

                <SettingsSection title="标题样式">
                  <div className="flex gap-2">
                    <select
                      value={selectedHeadingLevel}
                      onChange={(e) => setSelectedHeadingLevel(e.target.value as HeadingLevel)}
                      className="h-9 rounded-md border border-input bg-background px-2 text-xs outline-none focus:ring-1 focus:ring-ring"
                    >
                      {HEADING_LEVEL_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <select
                      value={config.headingStyles[selectedHeadingLevel] ?? "default"}
                      onChange={(e) =>
                        updateHeadingStyle(selectedHeadingLevel, e.target.value as HeadingStyleType)
                      }
                      className="h-9 flex-1 rounded-md border border-input bg-background px-2 text-xs outline-none focus:ring-1 focus:ring-ring"
                    >
                      {HEADING_STYLE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="text-[10px] text-muted-foreground">先选择标题级别，再选择样式。可重复设置各级标题。</p>
                </SettingsSection>

                <SettingsSection title="代码块高亮">
                  <select
                    value={config.codeBlockTheme}
                    onChange={(e) => updateConfig("codeBlockTheme", e.target.value)}
                    className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs outline-none focus:ring-1 focus:ring-ring"
                  >
                    {CODE_BLOCK_THEMES.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </SettingsSection>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Mac 风格代码块</span>
                    <Switch
                      id="mac-code-block"
                      label="Mac 风格代码块"
                      checked={config.macCodeBlock}
                      onCheckedChange={(v) => updateConfig("macCodeBlock", v)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">显示代码行号</span>
                    <Switch
                      id="show-line-number"
                      label="显示代码行号"
                      checked={config.showLineNumber}
                      onCheckedChange={(v) => updateConfig("showLineNumber", v)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">段落首行缩进</span>
                    <Switch
                      id="use-indent"
                      label="段落首行缩进"
                      checked={config.useIndent}
                      onCheckedChange={(v) => updateConfig("useIndent", v)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">段落两端对齐</span>
                    <Switch
                      id="use-justify"
                      label="段落两端对齐"
                      checked={config.useJustify}
                      onCheckedChange={(v) => updateConfig("useJustify", v)}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-border p-4">
                <Button
                  type="button"
                  className="w-full gap-2"
                  onClick={handleExport}
                  disabled={exporting}
                >
                  <Download className="w-4 h-4" />
                  {exporting ? "生成中…" : "导出 HTML"}
                </Button>
              </div>
            </div>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
