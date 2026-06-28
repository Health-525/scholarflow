"use client";

import { X } from "lucide-react";

import {
  CODE_BLOCK_THEMES,
  FONT_FAMILY_OPTIONS,
  FONT_SIZE_OPTIONS,
  HEADING_LEVEL_OPTIONS,
  HEADING_STYLE_OPTIONS,
  type HeadingLevel,
  type HeadingStyleType,
  type WechatStyleConfig,
} from "@/lib/notes/wechat-themes";
import { cn } from "@/lib/utils";

interface WechatAdvancedSettingsProps {
  config: WechatStyleConfig;
  updateConfig: <K extends keyof WechatStyleConfig>(key: K, value: WechatStyleConfig[K]) => void;
  updateHeadingStyle: (level: HeadingLevel, style: HeadingStyleType) => void;
  selectedHeadingLevel: HeadingLevel;
  onHeadingLevelChange: (level: HeadingLevel) => void;
  onClose: () => void;
}

function Switch({ checked, onCheckedChange, id, label }: { checked: boolean; onCheckedChange: (v: boolean) => void; id?: string; label: string }) {
  return (
    <label htmlFor={id} className={cn("relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors", checked ? "bg-primary" : "bg-muted-foreground/30")}>
      <span className="sr-only">{label}</span>
      <input id={id} type="checkbox" className="sr-only" checked={checked} onChange={(e) => onCheckedChange(e.target.checked)} />
      <span className={cn("inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform", checked ? "translate-x-[18px]" : "translate-x-1")} />
    </label>
  );
}

export function WechatAdvancedSettings({
  config,
  updateConfig,
  updateHeadingStyle,
  selectedHeadingLevel,
  onHeadingLevelChange,
  onClose,
}: WechatAdvancedSettingsProps) {
  return (
    <div className="absolute md:relative inset-y-0 right-0 w-full max-w-[280px] md:w-72 shrink-0 border-l border-border bg-card overflow-y-auto px-3 py-4 sm:px-4 space-y-3 z-10 shadow-lg md:shadow-none">
      <button type="button" onClick={onClose}
        className="absolute top-3 right-3 h-7 w-7 rounded-md inline-flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors">
        <X className="w-3.5 h-3.5" />
      </button>

      {/* Font group */}
      <Card>
        <SectionLabel>字体</SectionLabel>
        <OptionGrid cols={3}>
          {FONT_FAMILY_OPTIONS.map((opt) => (
            <OptionButton key={opt.label} active={config.fontFamily === opt.value} onClick={() => updateConfig("fontFamily", opt.value)}>
              {opt.label}
            </OptionButton>
          ))}
        </OptionGrid>
        <Divider />
        <SectionLabel>字号</SectionLabel>
        <OptionGrid cols={5}>
          {FONT_SIZE_OPTIONS.map((opt) => (
            <OptionButton key={opt.value} active={config.fontSize === opt.value} onClick={() => updateConfig("fontSize", opt.value)} title={opt.desc}>
              {opt.label}
            </OptionButton>
          ))}
        </OptionGrid>
      </Card>

      {/* Heading styles */}
      <Card>
        <SectionLabel>标题样式</SectionLabel>
        <div className="flex items-center gap-2 mb-2">
          <select value={selectedHeadingLevel}
            onChange={(e) => onHeadingLevelChange(e.target.value as HeadingLevel)}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs outline-none transition-all duration-150 focus:ring-1 focus:ring-ring">
            {HEADING_LEVEL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <OptionGrid cols={4}>
          {HEADING_STYLE_OPTIONS.map((opt) => {
            const active = (config.headingStyles[selectedHeadingLevel] ?? "default") === opt.value;
            const previewColor = opt.value === "color-only" ? config.primaryColor : undefined;
            return (
              <button key={opt.value} type="button"
                onClick={() => updateHeadingStyle(selectedHeadingLevel, opt.value)}
                className={cn("flex flex-col items-center gap-1 rounded-md border px-1 py-2 text-[10px] transition-all duration-150", active ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50")}>
                <span className={cn("text-base font-black", opt.value === "border-bottom" && "border-b-2", opt.value === "border-left" && "border-l-2 pl-1")}
                  style={{ color: previewColor, borderColor: previewColor }}>H</span>
                <span className="truncate">{opt.label}</span>
              </button>
            );
          })}
        </OptionGrid>
      </Card>

      {/* Code block theme */}
      <Card>
        <SectionLabel>代码高亮</SectionLabel>
        <select value={config.codeBlockTheme}
          onChange={(e) => updateConfig("codeBlockTheme", e.target.value)}
          className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs outline-none transition-all duration-150 focus:ring-1 focus:ring-ring">
          {CODE_BLOCK_THEMES.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </Card>

      {/* Toggles */}
      <Card>
        <SectionLabel>选项</SectionLabel>
        <div className="space-y-3">
          {([
            ["macCodeBlock", "Mac 风格代码块"],
            ["showLineNumber", "显示行号"],
            ["useIndent", "段落首行缩进"],
            ["useJustify", "段落两端对齐"],
          ] as const).map(([key, label]) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{label}</span>
              <Switch id={`sw-${key}`} label={label} checked={!!config[key]} onCheckedChange={(v) => updateConfig(key, v)} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ── Internal layout primitives ── */

function Card({ children }: { children: React.ReactNode }) {
  return <div className="bg-muted/30 rounded-xl p-3 border border-border/50 space-y-2">{children}</div>;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h3 className="text-[11px] font-semibold text-notes-tertiary uppercase tracking-wider">{children}</h3>;
}

function Divider() {
  return <div className="border-t border-border/30" />;
}

function OptionGrid({ cols, children }: { cols: number; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {children}
    </div>
  );
}

function OptionButton({ active, onClick, children, title }: { active: boolean; onClick: () => void; children: React.ReactNode; title?: string }) {
  return (
    <button type="button" title={title}
      onClick={onClick}
      className={cn("rounded-md border px-2 py-1.5 text-xs transition-colors", active ? "border-primary bg-sidebar-accent text-primary" : "border-border text-muted-foreground hover:bg-muted")}>
      {children}
    </button>
  );
}
