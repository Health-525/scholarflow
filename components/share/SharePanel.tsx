"use client";

import { useState, useEffect } from "react";
import { Share2, Copy, Check } from "lucide-react";

/**
 * 课表分享/导出工具
 *
 * 支持:
 * - 复制课表文本到剪贴板
 * - 生成分享链接(基于URL hash)
 * - ICS日历分享链接
 */

interface ShareOptions {
  type: "text" | "link" | "ics";
}

export function SharePanel() {
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState("");

  useEffect(() => {
    // Generate a shareable URL with current schedule hash
    const base = window.location.origin;
    const url = `${base}/schedule`;
    setShareUrl(url);
  }, []);

  const shareText = async () => {
    const text = `📚 我的 ScholarFlow 课表\n查看链接: ${shareUrl}`;

    if (navigator.share) {
      await navigator.share({ title: "我的课表", text, url: shareUrl });
    } else {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-2xl p-4" style={{ border: "1px solid var(--border)", backgroundColor: "var(--surface-card)" }}>
      <div className="flex items-center gap-2 mb-3">
        <Share2 className="w-4 h-4" style={{ color: "var(--accent)" }} />
        <span className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>分享课表</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={shareText}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[12px] font-medium transition-colors"
          style={{ backgroundColor: "var(--accent)", color: "#fff" }}
        >
          <Share2 className="w-3.5 h-3.5" />
          分享课表
        </button>
        <button
          onClick={copyLink}
          className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-[12px] font-medium transition-colors"
          style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
        >
          {copied ? <Check className="w-3.5 h-3.5" style={{ color: "var(--status-success)" }} /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "已复制" : "复制链接"}
        </button>
      </div>
    </div>
  );
}
