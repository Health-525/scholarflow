"use client";

import {
  ClipboardCheck,
  FileText,
  Info,
  Lightbulb,
  ListChecks,
  Send,
  Trash2,
  type LucideIcon,
} from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Mascot } from "@/components/ximi/Mascot";
import { MobileChat } from "@/components/ximi/MobileChat";
import { useChat } from "@/hooks/useChat";

const GREETING = "喵~ 我是你的学习伙伴小咪，今天想学点什么呀？🐾";

const QUICK_ACTIONS: {
  label: string;
  prompt: string;
  icon: LucideIcon;
}[] = [
  { label: "整理课堂笔记", prompt: "帮我整理课堂笔记", icon: FileText },
  { label: "生成知识小测", prompt: "帮我生成一份知识小测", icon: ListChecks },
  { label: "检查课后作业", prompt: "帮我检查课后作业", icon: ClipboardCheck },
  { label: "帮我写论文大纲", prompt: "帮我写一份论文大纲", icon: Lightbulb },
];

function CatAvatar() {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center self-end overflow-hidden rounded-full border-2 border-border bg-secondary">
      <Mascot size="xs" eager className="!drop-shadow-none" />
    </span>
  );
}

function DesktopChat() {
  const {
    messages,
    input,
    setInput,
    loading,
    streamingContent,
    ready,
    isNative,
    modelPhase,
    modelError,
    reloadModel,
    selectedModel,
    messagesEndRef,
    inputRef,
    sendMessage,
    handleKeyDown,
    clearChat,
  } = useChat();

  const isEmpty = messages.length === 0 && !streamingContent;

  return (
    <div className="hidden md:flex flex-col h-[calc(100vh-80px)] max-w-4xl mx-auto w-full">
      <PageHeader
        title="AI 助手"
        actions={
          <Button
            variant="ghost"
            size="sm"
            onClick={clearChat}
            disabled={messages.length === 0}
            className="text-muted-foreground"
          >
            <Trash2 className="w-4 h-4 mr-1.5" />
            清空对话
          </Button>
        }
      />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-6 space-y-5">
        {!ready &&
          (isNative ? (
            modelPhase === "error" ? (
              <div className="flex items-start gap-3 rounded-2xl border bg-card p-4">
                <CatAvatar />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">本地模型加载失败</p>
                  <p className="mt-1 text-xs text-muted-foreground">{modelError ?? "未知错误"}</p>
                  <Button size="sm" onClick={reloadModel} className="mt-2">
                    重试加载
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-2xl border bg-card p-4">
                <CatAvatar />
                <div>
                  <p className="text-sm font-semibold">正在加载端侧模型…</p>
                  <p className="text-xs text-muted-foreground">首次加载需要一点时间</p>
                </div>
              </div>
            )
          ) : (
            <div className="flex items-start gap-3 rounded-2xl border bg-card p-4">
              <CatAvatar />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">Ollama 服务离线</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  先运行{" "}
                  <code className="px-1 py-0.5 rounded bg-secondary text-xs">ollama serve</code>，再拉取{" "}
                  <code className="px-1 py-0.5 rounded bg-secondary text-xs">ollama pull qwen2.5</code>。
                </p>
              </div>
            </div>
          ))}

        {isEmpty ? (
          <div className="flex gap-3 max-w-[85%]">
            <CatAvatar />
            <div className="rounded-2xl rounded-bl-sm border bg-card px-4 py-3">
              <p className="text-sm leading-relaxed">{GREETING}</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {QUICK_ACTIONS.map(({ label, prompt, icon: Icon }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => {
                      setInput(prompt);
                      inputRef.current?.focus();
                    }}
                    className="flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs font-medium hover:bg-secondary transition-colors"
                  >
                    <Icon className="w-4 h-4 shrink-0 text-primary" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) =>
              msg.role === "user" ? (
                <div key={msg.id} className="flex justify-end">
                  <div className="max-w-[75%] rounded-2xl rounded-br-sm bg-primary px-4 py-3 text-primary-foreground">
                    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{msg.content}</p>
                  </div>
                </div>
              ) : (
                <div key={msg.id} className="flex gap-3 max-w-[85%]">
                  <CatAvatar />
                  <div className="rounded-2xl rounded-bl-sm border bg-card px-4 py-3">
                    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{msg.content}</p>
                  </div>
                </div>
              ),
            )}

            {loading && streamingContent && (
              <div className="flex gap-3 max-w-[85%]">
                <CatAvatar />
                <div className="rounded-2xl rounded-bl-sm border bg-card px-4 py-3">
                  <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                    {streamingContent}
                    <span className="ml-0.5 inline-block h-4 w-1 animate-pulse bg-primary align-middle" />
                  </p>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t bg-background pt-3 pb-4">
        <div className="flex items-end gap-2 rounded-2xl border bg-card p-2 focus-within:ring-1 focus-within:ring-ring">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={ready ? "和小咪聊聊学习吧…" : "AI 未就绪"}
            disabled={!ready || loading}
            rows={1}
            className="hide-scrollbar max-h-32 min-h-[40px] flex-1 resize-none border-none bg-transparent px-3 py-2.5 text-sm leading-relaxed outline-none placeholder:text-muted-foreground disabled:opacity-60"
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = "auto";
              target.style.height = Math.min(target.scrollHeight, 120) + "px";
            }}
          />
          <Button
            type="button"
            size="icon"
            onClick={sendMessage}
            disabled={!input.trim() || !ready || loading}
            aria-label="发送"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        {ready && (
          <p className="mt-1.5 flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
            <Info className="h-3 w-3" />
            {isNative ? "端侧模型运行中，回答仅供参考" : `当前模型 ${selectedModel}，回答仅供参考`}
          </p>
        )}
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <>
      <MobileChat />
      <DesktopChat />
    </>
  );
}
