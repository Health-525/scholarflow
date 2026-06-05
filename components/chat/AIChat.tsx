"use client";

import { useState, useRef, useEffect, useCallback } from "react";

// ── Types ──────────────────────────────────────────────────
interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

type ChatStatus = "idle" | "connecting" | "streaming" | "error";

// ── Ollama REST API (直接 HTTP 调用，不依赖 Node.js) ──────
const OLLAMA_BASE = "http://127.0.0.1:11434";
const MODEL_NAME = "qwen2.5:latest";

async function checkOllamaAvailable(): Promise<boolean> {
  try {
    const resp = await fetch(`${OLLAMA_BASE}/api/tags`);
    if (!resp.ok) return false;
    const data = await resp.json();
    return data.models?.length > 0;
  } catch {
    return false;
  }
}

async function* streamChat(messages: Message[]): AsyncGenerator<string> {
  const resp = await fetch(`${OLLAMA_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL_NAME,
      messages,
      stream: true,
    }),
  });

  if (!resp.ok || !resp.body) {
    throw new Error(`Ollama API error: ${resp.status}`);
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.trim() || !line.startsWith("data: ")) continue;
      try {
        const json = JSON.parse(line.slice(6));
        if (json.message?.content) {
          yield json.message.content;
        }
        if (json.done) return;
      } catch {
        // skip unparseable lines
      }
    }
  }
}

// ── System Prompt ──────────────────────────────────────────
const SYSTEM_PROMPT = `你是 ScholarFlow 学习助手，基于用户的学习数据提供帮助。
你可以回答以下问题：
- 课程表查询：今天有什么课？本周课程安排？
- 作业分析：有多少待办？哪些最紧急？
- 学习建议：根据课程内容和作业情况给出学习计划
- 跑步进度：运动情况分析和鼓励

请用中文回复，保持简洁有帮助。`;

// ── Component ──────────────────────────────────────────────
export function AIChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "system", content: SYSTEM_PROMPT },
  ]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<ChatStatus>("idle");
  const [ollamaAvailable, setOllamaAvailable] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 检测 Ollama 是否可用
  useEffect(() => {
    checkOllamaAvailable().then(setOllamaAvailable);
  }, []);

  // 自动滚动
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // 发送消息
  async function sendMessage() {
    const text = input.trim();
    if (!text || status === "streaming") return;

    const userMessage: Message = { role: "user", content: text };
    // 只发送最近 20 条消息以控制 token
    const contextMessages = [
      ...messages.slice(-19),
      userMessage,
    ].filter((m) => m.role !== "system" || messages[0].role === "system");
    // 始终包含 system prompt
    const apiMessages = messages[0].role === "system"
      ? [messages[0], ...contextMessages]
      : contextMessages;

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setStatus("connecting");

    try {
      setStatus("streaming");
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      let fullResponse = "";
      for await (const chunk of streamChat(apiMessages)) {
        fullResponse += chunk;
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last.role === "assistant") {
            last.content = fullResponse;
          }
          return updated;
        });
      }

      setStatus("idle");
    } catch {
      setStatus("error");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "⚠️ Ollama 连接失败。请确保 Ollama 正在运行，且已安装模型 `qwen2.5`。\n\n安装命令：`ollama pull qwen2.5`",
        },
      ]);
    }
  }

  // 键盘事件
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  // ── Render ──────────────────────────────────────────────
  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-24 md:bottom-6 right-4 z-50 w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105"
        style={{
          backgroundColor: "var(--accent)",
          color: "#fff",
        }}
        aria-label={isOpen ? "关闭AI助手" : "打开AI助手"}
      >
        <span className="text-lg">{isOpen ? "✕" : "🤖"}</span>
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div
          className="fixed bottom-40 md:bottom-20 right-4 z-50 w-[360px] max-w-[calc(100vw-2rem)] rounded-2xl overflow-hidden flex flex-col"
          style={{
            backgroundColor: "var(--surface-elevated)",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow-lg)",
            maxHeight: "500px",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 shrink-0"
            style={{ borderBottom: "1px solid var(--border-subtle)" }}
          >
            <div className="flex items-center gap-2">
              <span className="text-base">🤖</span>
              <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                ScholarFlow AI
              </span>
              {!ollamaAvailable && (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full"
                  style={{
                    backgroundColor: "var(--status-warning)",
                    color: "#fff",
                    opacity: 0.7,
                  }}
                >
                  未连接
                </span>
              )}
            </div>
          </div>

          {/* Messages */}
          <div
            className="overflow-y-auto px-4 py-3 space-y-3 flex-1"
            style={{ minHeight: "200px", maxHeight: "340px" }}
          >
            {messages
              .filter((m) => m.role !== "system")
              .map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className="max-w-[85%] rounded-xl px-3 py-2 text-sm"
                    style={{
                      backgroundColor:
                        msg.role === "user"
                          ? "var(--accent)"
                          : "var(--surface)",
                      color:
                        msg.role === "user"
                          ? "#fff"
                          : "var(--text-primary)",
                      border:
                        msg.role === "assistant"
                          ? "1px solid var(--border-subtle)"
                          : "none",
                    }}
                  >
                    <p className="whitespace-pre-wrap break-words leading-relaxed">
                      {msg.content || (status === "streaming" && msg === messages[messages.length - 1] ? "▊" : "")}
                    </p>
                  </div>
                </div>
              ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div
            className="px-4 py-3 shrink-0"
            style={{ borderTop: "1px solid var(--border-subtle)" }}
          >
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={ollamaAvailable ? "询问学习建议..." : "Ollama 未运行"}
                disabled={!ollamaAvailable || status === "streaming"}
                className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
                style={{
                  backgroundColor: "var(--surface)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                }}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || status === "streaming"}
                className="px-3 py-2 rounded-xl text-sm font-medium transition-opacity"
                style={{
                  backgroundColor: "var(--accent)",
                  color: "#fff",
                  opacity: !input.trim() || status === "streaming" ? 0.5 : 1,
                }}
              >
                发送
              </button>
            </div>
            {!ollamaAvailable && (
              <p className="text-[10px] mt-1.5" style={{ color: "var(--text-tertiary)" }}>
                请运行 <code>ollama pull qwen2.5</code> 安装模型后使用
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
