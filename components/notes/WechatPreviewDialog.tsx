"use client";

import { Dialog } from "@base-ui/react/dialog";
import { Copy, Download, Monitor, RotateCcw, Settings2, Smartphone, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { exportWechatHtml } from "@/lib/notes/export-import";
import { countArticleStats, fetchCodeBlockThemeCss, inlineWechatStyles, renderWechatPreviewHtml } from "@/lib/notes/wechat-renderer";
import {
  COLOR_OPTIONS,
  defaultWechatStyleConfig,
  FONT_FAMILY_OPTIONS,
  type HeadingLevel,
  type WechatStyleConfig,
} from "@/lib/notes/wechat-themes";
import { cn } from "@/lib/utils";

import { WechatAdvancedSettings } from "./WechatAdvancedSettings";

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
    if (raw) return { ...defaultWechatStyleConfig(), ...JSON.parse(raw) as Partial<WechatStyleConfig> };
  } catch { /* ignore */ }
  return defaultWechatStyleConfig();
}

function saveStoredConfig(config: WechatStyleConfig) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(config)); } catch { /* ignore */ }
}

export function WechatPreviewDialog({ open, onOpenChange, title, content }: WechatPreviewDialogProps) {
  const [config, setConfig] = useState<WechatStyleConfig>(defaultWechatStyleConfig());
  const [srcDoc, setSrcDoc] = useState("");
  const [codeThemeCss, setCodeThemeCss] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedHeadingLevel, setSelectedHeadingLevel] = useState<HeadingLevel>("h2");
  const [previewWidth, setPreviewWidth] = useState<"mobile" | "desktop">("desktop");
  const [stats, setStats] = useState({ chars: 0, words: 0, readingMinutes: 1 });
  const [previewError, setPreviewError] = useState<string | null>(null);
  const themeSeqRef = useRef(0);
  const isFirstSave = useRef(true);

  useEffect(() => {
    if (!open) return;
    const saved = loadStoredConfig();
    setConfig(saved);
    setPreviewWidth(saved.previewWidth);
  }, [open]);

  useEffect(() => {
    if (isFirstSave.current) { isFirstSave.current = false; return; }
    saveStoredConfig(config);
  }, [config]);

  useEffect(() => {
    if (!open) return;
    const stats = countArticleStats(content);
    setStats(stats);
  }, [open, content]);

  // Fetch code theme CSS with sequence counter to prevent stale responses
  useEffect(() => {
    let cancelled = false;
    const seq = ++themeSeqRef.current;

    fetchCodeBlockThemeCss(config.codeBlockTheme).then((css) => {
      if (!cancelled && seq === themeSeqRef.current) {
        setCodeThemeCss(css);
      }
    }).catch(() => {
      if (!cancelled && seq === themeSeqRef.current) {
        setCodeThemeCss(null);
      }
    });

    return () => { cancelled = true; };
  }, [config.codeBlockTheme]);

  const updatePreview = useCallback(async () => {
    try {
      setPreviewError(null);
      const html = await renderWechatPreviewHtml({
        title,
        content,
        config: { ...config, previewWidth },
        inlineCodeThemeCss: codeThemeCss,
      });
      setSrcDoc(html);
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : "渲染预览失败");
    }
  }, [title, content, config, codeThemeCss, previewWidth]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => { void updatePreview(); }, 150);
    return () => window.clearTimeout(timer);
  }, [open, updatePreview]);

  function updateConfig<K extends keyof WechatStyleConfig>(key: K, value: WechatStyleConfig[K]) {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }

  const updateHeadingStyle = useCallback((level: HeadingLevel, style: import("@/lib/notes/wechat-themes").HeadingStyleType) => {
    setConfig((prev) => {
      const next = { ...prev.headingStyles };
      if (style === "default") delete next[level];
      else next[level] = style;
      return { ...prev, headingStyles: next };
    });
  }, []);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try { await exportWechatHtml(title, content, config); }
    catch { toast.error("导出失败"); }
    finally { setExporting(false); }
  }, [title, content, config]);

  const handleCopyHtml = useCallback(async () => {
    try {
      const html = await renderWechatPreviewHtml({
        title, content,
        config: { ...config, previewWidth },
        inlineCodeThemeCss: codeThemeCss ?? undefined,
      });
      const inlined = await inlineWechatStyles(html);
      await navigator.clipboard.writeText(inlined);
      toast.success("已复制微信兼容 HTML 到剪贴板");
    } catch {
      toast.error("复制失败，请重试");
    }
  }, [title, content, config, codeThemeCss, previewWidth]);

  const handleReset = useCallback(() => {
    setConfig(defaultWechatStyleConfig());
    toast.info("已恢复默认样式");
  }, []);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        <Dialog.Popup className={cn(
          "fixed inset-0 z-50 flex flex-col bg-background outline-none",
          "md:inset-4 md:rounded-2xl md:shadow-xl md:ring-1 md:ring-border"
        )}>
          {/* Header */}
          <div className="flex items-center gap-3 shrink-0 border-b border-border px-4 py-2.5">
            <Dialog.Title className="text-sm font-semibold text-foreground shrink-0">
              公众号预览
            </Dialog.Title>
            <span className="hidden sm:inline text-[11px] text-notes-tertiary tabular-nums">
              {stats.chars} 字 · 约 {stats.readingMinutes} 分钟
            </span>

            {/* Color dots — desktop */}
            <div className="hidden sm:flex items-center gap-0.5 shrink-0">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  title={c.desc}
                  onClick={() => updateConfig("primaryColor", c.value)}
                  className={cn(
                    "w-5 h-5 rounded-full border-2 transition-all duration-150",
                    config.primaryColor === c.value
                      ? "ring-2 ring-primary ring-offset-1 ring-offset-background scale-110 border-primary"
                      : "border-transparent hover:scale-105"
                  )}
                  style={{ background: c.value }}
                />
              ))}
            </div>

            {/* Custom color picker */}
            <div className="w-5 h-5 rounded-full border border-border p-px shrink-0">
              <input
                type="color"
                value={config.primaryColor}
                onChange={(e) => updateConfig("primaryColor", e.target.value)}
                className="w-full h-full rounded-full cursor-pointer border-0 p-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-0"
                title="自定义颜色"
              />
            </div>

            <div className="flex-1" />

            <div className="flex items-center gap-0.5 shrink-0">
              {/* Preview width toggle */}
              <button type="button" title="移动端宽度"
                onClick={() => {
                  const w = previewWidth === "mobile" ? "desktop" : "mobile" as const;
                  setPreviewWidth(w);
                  updateConfig("previewWidth", w);
                }}
                className={cn("h-7 w-7 rounded-md inline-flex items-center justify-center transition-colors", previewWidth === "mobile" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted")}>
                {previewWidth === "mobile" ? <Smartphone className="w-3.5 h-3.5" /> : <Monitor className="w-3.5 h-3.5" />}
              </button>

              {/* Advanced settings toggle */}
              <button type="button" title="高级设置"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className={cn("h-7 w-7 rounded-md inline-flex items-center justify-center transition-colors", showAdvanced ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted")}>
                <Settings2 className="w-3.5 h-3.5" />
              </button>

              <button type="button" title="重置" onClick={handleReset}
                className="h-7 w-7 rounded-md inline-flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors">
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              <Dialog.Close render={<Button size="icon" variant="ghost" className="h-7 w-7" />}>
                <X className="w-3.5 h-3.5" />
              </Dialog.Close>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 flex min-h-0 overflow-hidden relative">
            {/* Preview */}
            <div className="flex-1 flex justify-center overflow-auto bg-muted/50 p-3 md:p-6">
              <div className={cn(
                "h-fit min-h-full bg-card rounded-xl overflow-hidden shadow-lg shadow-black/5 border border-border transition-all",
                previewWidth === "mobile" ? "w-full max-w-[414px]" : "w-full max-w-[720px]"
              )}>
                {previewError ? (
                  <div className="flex flex-col items-center justify-center min-h-[400px] gap-2 text-destructive">
                    <span className="text-xs">{previewError}</span>
                    <Button variant="secondary" size="sm" onClick={() => { void updatePreview(); }}>重试</Button>
                  </div>
                ) : srcDoc ? (
                  <iframe title="公众号预览" srcDoc={srcDoc} className="w-full border-0"
                    sandbox="allow-same-origin" style={{ height: "calc(100vh - 140px)", minHeight: "600px" }} />
                ) : (
                  <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
                    <div className="w-8 h-8 rounded-full border-2 border-border border-t-primary animate-spin" />
                    <span className="text-xs text-notes-tertiary">渲染预览中…</span>
                  </div>
                )}
              </div>
            </div>

            {/* Advanced settings panel */}
            {showAdvanced && (
              <WechatAdvancedSettings
                config={config}
                updateConfig={updateConfig}
                updateHeadingStyle={updateHeadingStyle}
                selectedHeadingLevel={selectedHeadingLevel}
                onHeadingLevelChange={setSelectedHeadingLevel}
                onClose={() => setShowAdvanced(false)}
              />
            )}
          </div>

          {/* Bottom bar */}
          <div className="flex items-center gap-2 shrink-0 border-t border-border pt-3 px-4 pb-2.5">
            <span className="text-xs text-muted-foreground/60">
              {COLOR_OPTIONS.find((c) => c.value === config.primaryColor)?.label || config.primaryColor}
              {" · "}
              {FONT_FAMILY_OPTIONS.find((f) => f.value === config.fontFamily)?.label || "默认字体"}
            </span>
            <span className="text-[11px] text-muted-foreground/40 mr-auto">
              {stats.chars} 字 · 约 {stats.readingMinutes} 分钟阅读
            </span>
            <Button type="button" size="sm" className="gap-1.5 bg-primary text-primary-foreground hover:bg-notes-primary-hover rounded-lg px-4 h-9" onClick={handleCopyHtml}>
              <Copy className="w-3.5 h-3.5" /> 复制 HTML
            </Button>
            <Button type="button" size="sm" className="gap-1.5 rounded-lg transition-all duration-150" onClick={handleExport} disabled={exporting}>
              <Download className="w-3.5 h-3.5" /> {exporting ? "生成中…" : "导出"}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
