"use client";

import { Bot, Send, Trash2, Sparkles, Settings, ChevronDown, User, Loader2, AlertCircle, RefreshCw } from "lucide-react";

import { MobileChat } from "@/components/ximi/MobileChat";
import { useChat, MODEL_KEY } from "@/hooks/useChat";

export default function ChatPage() {
  const {
    messages,
    input,
    setInput,
    loading,
    streamingContent,
    mounted,
    ollamaOnline,
    models,
    selectedModel,
    setSelectedModel,
    showModelPicker,
    setShowModelPicker,
    error,
    messagesEndRef,
    inputRef,
    checkOllama,
    sendMessage,
    clearChat,
    handleKeyDown,
  } = useChat();

  return (
    <>
      {/* 移动端：萌系「小咪」AI 助手 */}
      <MobileChat />

      {/* 桌面端：原版 AI 助手（保持不变） */}
      {!mounted ? (
        <div className="hidden md:block max-w-5xl mx-auto py-6 animate-page">
          <div className="rounded-2xl p-5 bg-card border border-border skeleton h-96" />
        </div>
      ) : (
        <div className="hidden md:flex max-w-5xl mx-auto py-6 animate-page flex-col" style={{ minHeight: "calc(100vh - 120px)" }}>
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
                    <div className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${msg.role === "user" ? "bg-primary/10" : "bg-teal-500/10 dark:bg-teal-400/10"}`}>
                      {msg.role === "user" ? (
                        <User className="w-3.5 h-3.5 text-primary" />
                      ) : (
                        <Bot className="w-3.5 h-3.5 text-teal-500 dark:text-teal-400" />
                      )}
                    </div>
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-medium mb-1 text-muted-foreground">
                        {msg.role === "user" ? "你" : "AI 助手"} · {new Date(msg.timestamp).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                      <div className={`rounded-xl p-3 text-[13px] leading-relaxed whitespace-pre-wrap ${msg.role === "user" ? "bg-primary/10" : "bg-teal-500/10 dark:bg-teal-400/10"} text-foreground`}>
                        {msg.content}
                      </div>
                    </div>
                  </div>
                ))}
                {/* Streaming message */}
                {loading && streamingContent && (
                  <div className="flex gap-3 animate-fade-up">
                    <div className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center bg-teal-500/10 dark:bg-teal-400/10">
                      <Bot className="w-3.5 h-3.5 text-teal-500 dark:text-teal-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-medium mb-1 text-muted-foreground">
                        AI 助手 · 思考中...
                      </div>
                      <div className="rounded-xl p-3 text-[13px] leading-relaxed whitespace-pre-wrap bg-teal-500/10 dark:bg-teal-400/10 text-foreground">
                        {streamingContent}
                        <span className="inline-block w-1.5 h-4 bg-primary/60 animate-pulse ml-0.5" />
                      </div>
                    </div>
                  </div>
                )}
                {/* Loading indicator (no content yet) */}
                {loading && !streamingContent && (
                  <div className="flex gap-3 animate-fade-up">
                    <div className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center bg-teal-500/10 dark:bg-teal-400/10">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-500 dark:text-teal-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-medium mb-1 text-muted-foreground">
                        AI 助手 · 思考中...
                      </div>
                      <div className="rounded-xl p-3 text-[13px] bg-teal-500/10 dark:bg-teal-400/10 text-muted-foreground">
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
      )}
    </>
  );
}
