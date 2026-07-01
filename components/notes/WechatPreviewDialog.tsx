"use client";

import { Dialog } from "@base-ui/react/dialog";
import { Check, Copy, Download, Monitor, RotateCcw, Settings2, Smartphone, X } from "lucide-react";
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
const COPY_FEEDBACK_DURATION = 1500;

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
  const [copied, setCopied] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedHeadingLevel, setSelectedHeadingLevel] = useState<HeadingLevel>("h2");
  const [previewWidth, setPreviewWidth] = useState<"mobile" | "desktop">("desktop");
  const [stats, setStats] = useState({ chars: 0, words: 0, readingMinutes: 1 });
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewKey, setPreviewKey] = useState(0);
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

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        setPreviewError(null);
        const html = await renderWechatPreviewHtml({
          title,
          content,
          config: { ...config, previewWidth },
          inlineCodeThemeCss: codeThemeCss,
        });
        if (cancelled) return;
        setSrcDoc(html);
        setPreviewKey((k) => k + 1);
      } catch (err) {
        if (cancelled) return;
        setPreviewError(err instanceof Error ? err.message : "渲染预览失败");
      }
    }, 150);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, title, content, config, codeThemeCss, previewWidth]);

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
      setCopied(true);
      setTimeout(() => setCopied(false), COPY_FEEDBACK_DURATION);
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
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Popup className={cn(
          "fixed inset-0 z-50 flex flex-col bg-background outline-none",
          "md:inset-4 md:rounded-xl md:shadow-lg md:ring-1 md:ring-border"
        )}>
          {/* Header */}
          <div className="flex items-center gap-3 shrink-0 border-b border-border px-4 py-2.5">
            <Dialog.Title className="text-sm font-semibold text-foreground shrink-0">
              公众号预览
            </Dialog.Title>
            <span className="hidden sm:inline text-xs text-muted-foreground tabular-nums">
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
                    "w-5 h-5 rounded-full border-2 transition-colors",
                    config.primaryColor === c.value
                      ? "ring-2 ring-primary ring-offset-1 ring-offset-background border-primary"
                      : "border-transparent hover:border-muted-foreground/30"
                  )}
                  style={{ background: c.value }}
                />
              ))}
            </div>

            {/* Divider */}
            <div className="hidden sm:block w-px h-4 bg-border shrink-0" />

            {/* Custom color picker */}
            <div className={cn(
              "w-5 h-5 rounded-full border-2 p-px shrink-0 transition-colors",
              !COLOR_OPTIONS.some((c) => c.value === config.primaryColor)
                ? "border-primary ring-2 ring-primary ring-offset-1 ring-offset-background"
                : "border-border hover:border-muted-foreground/30"
            )}>
              <input
                type="color"
                value={config.primaryColor}
                onChange={(e) => updateConfig("primaryColor", e.target.value)}
                className="w-full h-full rounded-full cursor-pointer border-0 p-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-0"
                title="自定义颜色"
              />
            </div>

            <div className="flex-1" />

            <div className="flex items-center gap-1 shrink-0">
              {/* Preview width toggle */}
              <button type="button"
                title={previewWidth === "mobile" ? "切换到桌面端宽度" : "切换到移动端宽度"}
                onClick={() => {
                  const w = previewWidth === "mobile" ? "desktop" : "mobile" as const;
                  setPreviewWidth(w);
                  updateConfig("previewWidth", w);
                }}
                className={cn("h-7 w-7 rounded-lg inline-flex items-center justify-center transition-colors", previewWidth === "mobile" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
                {previewWidth === "mobile" ? <Smartphone className="w-3.5 h-3.5" /> : <Monitor className="w-3.5 h-3.5" />}
              </button>

              {/* Advanced settings toggle */}
              <button type="button"
                title={showAdvanced ? "关闭高级设置" : "高级设置"}
                onClick={() => setShowAdvanced(!showAdvanced)}
                className={cn("h-7 w-7 rounded-lg inline-flex items-center justify-center transition-colors", showAdvanced ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
                <Settings2 className="w-3.5 h-3.5" />
              </button>

              <button type="button" title="恢复默认样式" onClick={handleReset}
                className="h-7 w-7 rounded-lg inline-flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              <Dialog.Close render={<Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg hover:bg-muted" />}>
                <X className="w-3.5 h-3.5" />
              </Dialog.Close>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 flex min-h-0 overflow-hidden relative">
            {/* Preview */}
            <div className="flex-1 flex justify-center overflow-auto bg-muted p-3 md:p-6">
              <div
                className="h-fit min-h-full w-full bg-card rounded-xl overflow-hidden shadow-md border border-border"
                style={{ maxWidth: previewWidth === "mobile" ? 414 : 720 }}
              >
                {previewError ? (
                  <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 text-destructive/80">
                    <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                      <X className="w-5 h-5 text-destructive" />
                    </div>
                    <span className="text-xs">{previewError}</span>
                    <Button variant="secondary" size="sm" className="rounded-lg" onClick={() => setPreviewKey((k) => k + 1)}>重试</Button>
                  </div>
                ) : srcDoc ? (
                  <iframe key={previewKey} title="公众号预览" srcDoc={srcDoc} className="w-full border-0"
                    sandbox="allow-same-origin" style={{ height: "calc(100vh - 140px)", minHeight: "600px" }} />
                ) : (
                  <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full border-2 border-muted-foreground/15 border-t-primary animate-spin" />
                      <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary/30 animate-spin" style={{ animationDuration: "2s" }} />
                    </div>
                    <span className="text-xs text-muted-foreground/50">渲染预览中…</span>
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
          <div className="flex items-center gap-2 shrink-0 border-t border-border px-4 py-2.5">
            {/* Color chip + label */}
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full border border-border shrink-0" style={{ background: config.primaryColor }} />
              <span className="text-xs text-muted-foreground">
                {COLOR_OPTIONS.find((c) => c.value === config.primaryColor)?.label || config.primaryColor}
              </span>
            </div>
            <span className="text-muted-foreground/30">·</span>
            <span className="text-xs text-muted-foreground">
              {FONT_FAMILY_OPTIONS.find((f) => f.value === config.fontFamily)?.label || "默认字体"}
            </span>
            <span className="text-xs text-muted-foreground/40 mr-auto">
              {stats.chars} 字 · 约 {stats.readingMinutes} 分钟
            </span>
            <Button type="button" size="sm" className={cn("gap-1.5 rounded-lg px-4 h-9 transition-colors", copied ? "bg-status-success hover:bg-status-success/90 text-primary-foreground" : "bg-primary text-primary-foreground hover:bg-primary/90")} onClick={handleCopyHtml}>
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copied ? "已复制" : "复制 HTML"}
            </Button>
            <Button type="button" size="sm" variant="secondary" className="gap-1.5 rounded-lg transition-colors" onClick={handleExport} disabled={exporting}>
              <Download className="w-3.5 h-3.5" /> {exporting ? "生成中…" : "导出"}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
