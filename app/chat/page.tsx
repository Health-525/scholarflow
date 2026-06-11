"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Bot, Send, Trash2, Sparkles, Settings, ChevronDown, User, Loader2, AlertCircle, RefreshCw } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
}

interface ModelInfo {
  name: string;
  size: number;
  modified_at: string;
}

const SYSTEM_PROMPT = `你是 ScholarFlow AI 助手，一个面向大学生的智能学习伙伴。你的职责：
1. 回答学习相关问题（数学、编程、统计、AI等）
2. 帮助理解课程概念，提供通俗解释和类比
3. 给出学习建议和时间规划
4. 用中文回答，保持简洁专业
5. 如果不确定，坦诚说明而非猜测`;

const STORAGE_KEY = "sf_chat_messages";
const MODEL_KEY = "sf_chat_model";

function loadMessages(): Message[] {
  try {
    const r = localStorage.getItem(STORAGE_KEY);
    if (r) return JSON.parse(r);
  } catch { /* ignore */ }
  return [];
}

function saveMessages(messages: Message[]) {
  try {
    // Keep last 100 messages to avoid storage overflow
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-100)));
  } catch { /* ignore */ }
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [ollamaOnline, setOllamaOnline] = useState(false);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState("qwen2.5");
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setMounted(true);
    setIsDark(
      document.documentElement.getAttribute("data-theme") === "dark"
      || (document.documentElement.getAttribute("data-theme") !== "light"
          && window.matchMedia("(prefers-color-scheme: dark)").matches)
    );
    setMessages(loadMessages());
    const savedModel = localStorage.getItem(MODEL_KEY);
    if (savedModel) setSelectedModel(savedModel);
  }, []);

  // Check Ollama status
  const checkOllama = useCallback(async () => {
    try {
      const res = await fetch("/api/chat");
      if (res.ok) {
        const data = await res.json();
        setOllamaOnline(data.online);
        if (data.models) {
          setModels(data.models);
          if (data.models.length > 0 && !localStorage.getItem(MODEL_KEY)) {
            setSelectedModel(data.models[0].name);
          }
        }
        setError(null);
      } else {
        setOllamaOnline(false);
        const data = await res.json();
        setError(data.error || "Ollama 服务离线");
      }
    } catch {
      setOllamaOnline(false);
      setError("无法连接到 Ollama 服务");
    }
  }, []);

  useEffect(() => { checkOllama(); }, [checkOllama]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      role: "user",
      content: input.trim(),
      timestamp: Date.now(),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setStreamingContent("");
    setError(null);
    saveMessages(newMessages);

    try {
      const chatMessages = [
        { role: "system", content: SYSTEM_PROMPT },
        ...newMessages.map(m => ({ role: m.role, content: m.content })),
      ];

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: selectedModel, messages: chatMessages, stream: true }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "请求失败");
        setLoading(false);
        return;
      }

      // Parse streaming response
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          // Ollama sends JSON lines
          const lines = chunk.split("\n").filter(l => l.trim());
          for (const line of lines) {
            try {
              const parsed = JSON.parse(line);
              if (parsed.message?.content) {
                fullContent += parsed.message.content;
                setStreamingContent(fullContent);
              }
              if (parsed.done) {
                // Stream complete
              }
            } catch { /* skip malformed lines */ }
          }
        }
      }

      const assistantMsg: Message = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        role: "assistant",
        content: fullContent || "（无回复内容）",
        timestamp: Date.now(),
      };

      const finalMessages = [...newMessages, assistantMsg];
      setMessages(finalMessages);
      saveMessages(finalMessages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "网络错误");
    } finally {
      setLoading(false);
      setStreamingContent("");
    }
  }, [input, loading, messages, selectedModel]);

  const clearChat = useCallback(() => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  if (!mounted) {
    return (
      <div className="max-w-5xl mx-auto py-6 animate-page">
        <div className="rounded-2xl p-5 bg-card border border-border skeleton h-96" />
      </div>
    );
  }

  const bgCard = isDark ? "#1a1a22" : "#fffdf9";
  const bgUser = isDark ? "rgba(124,142,219,0.14)" : "rgba(42,68,148,0.08)";
  const bgAssistant = isDark ? "rgba(45,212,191,0.08)" : "rgba(6,182,212,0.06)";
  const textColor = isDark ? "#eae8e3" : "#1a1510";
  const mutedColor = isDark ? "rgba(234,232,227,0.48)" : "rgba(26,21,16,0.55)";
  const borderColor = isDark ? "rgba(234,232,227,0.10)" : "rgba(26,21,16,0.10)";

  return (
    <div className="max-w-5xl mx-auto py-6 animate-page flex flex-col" style={{ minHeight: "calc(100vh - 120px)" }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-primary/10">
          <Bot className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold font-display text-foreground">AI 学习助手</h1>
          <p className="text-[12px] text-muted-foreground">
            {ollamaOnline ? `在线 · ${selectedModel}` : "离线 · 请启动 Ollama"}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Model picker */}
          <button
            onClick={() => setShowModelPicker(!showModelPicker)}
            className="px-3 py-2 rounded-xl text-[12px] font-medium flex items-center gap-1 bg-card text-muted-foreground border border-border"
          >
            <Settings className="w-3.5 h-3.5" />
            {selectedModel}
            <ChevronDown className="w-3 h-3" />
          </button>
          {/* Refresh status */}
          <button onClick={checkOllama} className="px-3 py-2 rounded-xl text-[12px] font-medium flex items-center gap-1 bg-card text-muted-foreground border border-border">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          {/* Clear */}
          <button onClick={clearChat} className="px-3 py-2 rounded-xl text-[12px] font-medium flex items-center gap-1 bg-card text-muted-foreground border border-border hover:text-red-500">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Model picker dropdown */}
      {showModelPicker && models.length > 0 && (
        <div className="mb-4 rounded-xl p-3 bg-card border border-border shadow-sm animate-fade-up">
          <div className="text-[11px] font-semibold text-muted-foreground mb-2">选择模型</div>
          <div className="flex flex-wrap gap-2">
            {models.map(m => (
              <button
                key={m.name}
                onClick={() => {
                  setSelectedModel(m.name);
                  localStorage.setItem(MODEL_KEY, m.name);
                  setShowModelPicker(false);
                }}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
                  selectedModel === m.name
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "bg-secondary text-muted-foreground border border-transparent hover:text-foreground"
                }`}
              >
                {m.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Ollama offline banner */}
      {!ollamaOnline && (
        <div className="mb-4 rounded-xl p-4 bg-red-500/5 border border-red-500/20 animate-fade-up">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span className="text-[13px] font-semibold text-red-500">Ollama 服务离线</span>
          </div>
          <p className="text-[12px] text-muted-foreground">
            请先安装并启动 Ollama：<code className="px-1.5 py-0.5 rounded bg-secondary text-[11px]">ollama serve</code>
            ，然后拉取模型：<code className="px-1.5 py-0.5 rounded bg-secondary text-[11px]">ollama pull qwen2.5</code>
          </p>
        </div>
      )}

      {/* Error banner */}
      {error && ollamaOnline && (
        <div className="mb-4 rounded-xl p-3 bg-red-500/5 border border-red-500/20 animate-fade-up">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-red-500" />
            <span className="text-[12px] text-red-500">{error}</span>
          </div>
        </div>
      )}

      {/* Chat messages area */}
      <div className="flex-1 overflow-y-auto mb-4 rounded-2xl p-4 bg-card border border-border shadow-sm" style={{ minHeight: "300px" }}>
        {messages.length === 0 && !streamingContent ? (
          <div className="flex flex-col items-center justify-center h-full py-16 animate-fade-up">
            <div className="w-14 h-14 mb-4 rounded-2xl flex items-center justify-center bg-primary/10">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-[14px] font-semibold mb-1.5 text-foreground">开始对话</h3>
            <p className="text-[12px] leading-relaxed max-w-[280px] mx-auto text-muted-foreground text-center">
              向 AI 助手提问学习问题，获取概念解释、学习建议和代码帮助。
            </p>
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              {["解释 PCA 的数学原理", "帮我理解特征值分解", "Python 数据处理最佳实践"].map(q => (
                <button
                  key={q}
                  onClick={() => setInput(q)}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-medium bg-secondary text-muted-foreground hover:text-foreground hover:bg-primary/10 transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map(msg => (
              <div key={msg.id} className={`flex gap-3 animate-fade-up ${msg.role === "user" ? "" : ""}`}>
                {/* Avatar */}
                <div className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center" style={{
                  backgroundColor: msg.role === "user" ? bgUser : bgAssistant,
                }}>
                  {msg.role === "user" ? (
                    <User className="w-3.5 h-3.5" style={{ color: isDark ? "#7c8edb" : "#2a4494" }} />
                  ) : (
                    <Bot className="w-3.5 h-3.5" style={{ color: isDark ? "#2dd4bf" : "#06b6d4" }} />
                  )}
                </div>
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-medium mb-1" style={{ color: mutedColor }}>
                    {msg.role === "user" ? "你" : "AI 助手"} · {new Date(msg.timestamp).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                  <div className="rounded-xl p-3 text-[13px] leading-relaxed whitespace-pre-wrap" style={{
                    backgroundColor: msg.role === "user" ? bgUser : bgAssistant,
                    color: textColor,
                  }}>
                    {msg.content}
                  </div>
                </div>
              </div>
            ))}
            {/* Streaming message */}
            {loading && streamingContent && (
              <div className="flex gap-3 animate-fade-up">
                <div className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: bgAssistant }}>
                  <Bot className="w-3.5 h-3.5" style={{ color: isDark ? "#2dd4bf" : "#06b6d4" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-medium mb-1" style={{ color: mutedColor }}>
                    AI 助手 · 思考中...
                  </div>
                  <div className="rounded-xl p-3 text-[13px] leading-relaxed whitespace-pre-wrap" style={{
                    backgroundColor: bgAssistant,
                    color: textColor,
                  }}>
                    {streamingContent}
                    <span className="inline-block w-1.5 h-4 bg-primary/60 animate-pulse ml-0.5" />
                  </div>
                </div>
              </div>
            )}
            {/* Loading indicator (no content yet) */}
            {loading && !streamingContent && (
              <div className="flex gap-3 animate-fade-up">
                <div className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: bgAssistant }}>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: isDark ? "#2dd4bf" : "#06b6d4" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-medium mb-1" style={{ color: mutedColor }}>
                    AI 助手 · 思考中...
                  </div>
                  <div className="rounded-xl p-3 text-[13px]" style={{ backgroundColor: bgAssistant, color: mutedColor }}>
                    正在生成回复...
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="flex items-end gap-2 animate-fade-up">
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={ollamaOnline ? "输入学习问题... (Enter 发送, Shift+Enter 换行)" : "Ollama 离线，无法发送消息"}
          disabled={!ollamaOnline || loading}
          rows={1}
          className="flex-1 px-4 py-3 rounded-xl text-[13px] outline-none bg-card border border-border text-foreground placeholder:text-muted-foreground focus:border-primary/30 focus:ring-1 focus:ring-primary/20 transition-all resize-none disabled:opacity-50"
          style={{ maxHeight: "120px" }}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = "auto";
            target.style.height = Math.min(target.scrollHeight, 120) + "px";
          }}
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || !ollamaOnline || loading}
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-primary text-primary-foreground hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
}