"use client";

import { useState, useRef, useEffect } from "react";

interface Message { role: "user" | "assistant"; content: string; }

const OLLAMA_HOST = typeof window !== "undefined"
  ? (localStorage.getItem("sf_ollama_host") || "http://localhost:11434")
  : "http://localhost:11434";

export function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([{
    role: "assistant",
    content: "你好！我是 ScholarFlow AI 助手。我可以帮你分析笔记、解释概念、推荐学习计划。试试问我：\"帮我总结今天的笔记\" 或 \"解释一下特征值分解\"",
  }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Check Ollama
  useEffect(() => {
    if (isOpen) {
      fetch(`${OLLAMA_HOST}/api/tags`)
        .then(r => r.json())
        .then(d => { if (d.models?.[0]) setModel(d.models[0].name); })
        .catch(() => setModel(""));
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Message = { role: "user", content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    // Add context from notes (read from localStorage)
    const notesContext = getNotesContext();

    try {
      const res = await fetch(`${OLLAMA_HOST}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: model || "llama3",
          prompt: `你是一个大学生的学习助手。根据以下笔记内容回答问题。回答简洁、中文。

笔记摘要: ${notesContext}

问题: ${userMsg.content}`,
          stream: false,
        }),
      });

      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.response || "无法连接到AI模型，请确保Ollama正在运行。" }]);
    } catch {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: model ? "AI模型连接失败，请检查Ollama服务" : "未检测到Ollama。请安装Ollama并下载模型后重试。"
      }]);
    }
    setLoading(false);
  };

  return (
    <>
      {/* Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-24 md:bottom-6 right-32 z-50 w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105"
        style={{ backgroundColor: "var(--accent)", color: "#fff" }}
        aria-label="AI助手"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z"/><path d="M8 14v-2a4 4 0 0 1 8 0v2"/><circle cx="12" cy="18" r="4"/></svg>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div
            className="fixed bottom-56 md:bottom-20 right-4 z-50 w-[360px] max-w-[90vw] rounded-2xl overflow-hidden flex flex-col"
            style={{
              backgroundColor: "var(--surface-elevated)",
              border: "1px solid var(--border)",
              boxShadow: "var(--shadow-lg)",
              height: "460px",
              maxHeight: "70vh",
            }}
          >
            {/* Header */}
            <div className="px-4 py-3 flex items-center justify-between shrink-0" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: "var(--accent-soft)" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="var(--accent)"><path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z"/><path d="M8 14v-2a4 4 0 0 1 8 0v2"/><circle cx="12" cy="18" r="4"/></svg>
                </div>
                <span className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>AI 助手</span>
                {model && <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>{model}</span>}
              </div>
              <button onClick={() => setIsOpen(false)} className="p-1 rounded-lg" style={{ color: "var(--text-muted)" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className="max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[12px] leading-relaxed"
                    style={{
                      backgroundColor: m.role === "user" ? "var(--accent)" : "var(--surface)",
                      color: m.role === "user" ? "#fff" : "var(--text-primary)",
                      borderBottomRightRadius: m.role === "user" ? "4px" : undefined,
                      borderBottomLeftRadius: m.role === "assistant" ? "4px" : undefined,
                    }}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="px-3.5 py-2.5 rounded-2xl text-[12px]" style={{ backgroundColor: "var(--surface)", color: "var(--text-tertiary)" }}>
                    思考中...
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="px-3 py-3 shrink-0" style={{ borderTop: "1px solid var(--border-subtle)" }}>
              <form onSubmit={e => { e.preventDefault(); send(); }} className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="问我任何学习相关的问题..."
                  className="flex-1 px-3 py-2.5 rounded-xl text-[12px] outline-none"
                  style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors"
                  style={{ backgroundColor: input.trim() ? "var(--accent)" : "var(--surface)", color: input.trim() ? "#fff" : "var(--text-muted)" }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                </button>
              </form>
            </div>
          </div>
        </>
      )}
    </>
  );
}

function getNotesContext(): string {
  // Read from localStorage cache or IndexedDB
  try {
    const cache = localStorage.getItem("sf_notes_summary");
    if (cache) return cache.slice(0, 500);
  } catch { /* ignore */ }
  return "用户尚未保存笔记。建议用户去笔记页面记录学习内容。";
}
