"use client";

import Link from "next/link";

// 顶层入口目录定义（对应 jiangshu-study 的文件夹）
const SECTIONS = [
  {
    group: "课程笔记",
    items: [
      { path: "01-大数据技术基础",     label: "大数据技术基础",        emoji: "🗄️" },
      { path: "02-Python数据处理与分析", label: "Python数据处理与分析",  emoji: "🐍" },
      { path: "03-Data-Structure",     label: "数据结构与算法",        emoji: "🌲" },
      { path: "04-多元统计分析",         label: "多元统计分析",          emoji: "📊" },
      { path: "05-数值分析",             label: "数值分析",              emoji: "🔢" },
      { path: "06-数学模型与数学软件",   label: "数学模型与数学软件",    emoji: "📐" },
      { path: "07-英语",                 label: "英语",                  emoji: "📝" },
      { path: "08-AI学习",               label: "AI学习",                emoji: "🤖" },
    ],
  },
  {
    group: "其他笔记",
    items: [
      { path: "10-灵感感悟",  label: "灵感感悟",    emoji: "💡" },
      { path: "11-活动",      label: "活动记录",    emoji: "🎪" },
      { path: "Clippings",    label: "网页收藏",    emoji: "📎" },
      { path: "youtube-daily", label: "YouTube笔记", emoji: "▶️" },
      { path: "00-Inbox",     label: "收件箱",      emoji: "📥" },
    ],
  },
];

export default function NotesPage() {
  return (
    <div className="max-w-5xl mx-auto py-7 pb-24 md:pb-8">
      {/* Header */}
      <header className="mb-7 animate-fade-up">
        <h1
          className="text-2xl font-semibold"
          style={{
            fontFamily: "'Noto Serif SC', Georgia, serif",
            color: "var(--text-primary)",
            letterSpacing: "-0.01em",
          }}
        >
          笔记
        </h1>
        <p className="text-[12.5px] mt-1.5 tracking-wide" style={{ color: "var(--text-tertiary)" }}>
          jiangshu-study 仓库内容浏览
        </p>
        <div className="mt-4 flex items-center gap-2">
          <div className="h-px" style={{ background: "linear-gradient(90deg, var(--accent) 0%, transparent 100%)", width: 48, opacity: 0.4 }} />
          <div className="h-px flex-1" style={{ background: "var(--border-subtle)" }} />
        </div>
      </header>

      {/* Sections：桌面端并排两列 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-up stagger-1">
        {SECTIONS.map((section) => (
          <div key={section.group}>
            <p
              className="text-[11px] font-semibold uppercase tracking-widest mb-3"
              style={{ color: "var(--text-muted)" }}
            >
              {section.group}
            </p>
            <div className="sf-card divide-y" style={{ borderColor: "var(--border-subtle)" }}>
              {section.items.map((item) => (
                <Link
                  key={item.path}
                  href={`/notes/${encodeURIComponent(item.path)}`}
                  className="flex items-center gap-3 px-4 py-3 group transition-colors hover:bg-[var(--accent-softer)] first:rounded-t-[calc(var(--radius-lg)-1px)] last:rounded-b-[calc(var(--radius-lg)-1px)]"
                  aria-label={`打开 ${item.label}`}
                >
                  <span className="text-lg w-6 text-center" aria-hidden="true">{item.emoji}</span>
                  <span className="flex-1 text-[13.5px]" style={{ color: "var(--text-primary)" }}>
                    {item.label}
                  </span>
                  <span
                    className="text-[11px] opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: "var(--accent)" }}
                    aria-hidden="true"
                  >
                    →
                  </span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
