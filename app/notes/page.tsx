"use client";

export default function NotesPage() {
  return (
    <div className="flex items-center justify-center h-full py-20">
      <div className="text-center animate-fade-up">
        <div className="text-6xl mb-4 opacity-40" aria-hidden="true">📂</div>
        <h2
          className="text-lg font-semibold mb-2"
          style={{ fontFamily: "'Noto Serif SC', Georgia, serif", color: "var(--text-primary)" }}
        >
          笔记
        </h2>
        <p className="text-[13px] max-w-xs mx-auto leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
          从左侧文件树选择一个笔记或文件夹开始浏览
        </p>
        <p className="text-[11px] mt-3" style={{ color: "var(--text-muted)" }}>
          jiangshu-study 仓库内容
        </p>
      </div>
    </div>
  );
}
