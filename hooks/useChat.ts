"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
}

export interface ModelInfo {
  name: string;
  size: number;
  modified_at: string;
}

export const SYSTEM_PROMPT = `你是 ScholarFlow AI 助手，一个面向大学生的智能学习伙伴。你的职责：
1. 回答学习相关问题（数学、编程、统计、AI等）
2. 帮助理解课程概念，提供通俗解释和类比
3. 给出学习建议和时间规划
4. 用中文回答，保持简洁专业
5. 如果不确定，坦诚说明而非猜测`;

export const STORAGE_KEY = "sf_chat_messages";
export const MODEL_KEY = "sf_chat_model";

function loadMessages(): ChatMessage[] {
  try {
    const r = localStorage.getItem(STORAGE_KEY);
    if (r) return JSON.parse(r);
  } catch { /* ignore */ }
  return [];
}

function saveMessages(messages: ChatMessage[]) {
  try {
    // Keep last 100 messages to avoid storage overflow
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-100)));
  } catch { /* ignore */ }
}

/**
 * 共享聊天逻辑 hook — 从 app/chat/page.tsx 原样抽取,
 * 供桌面端 ChatPage 与移动端 MobileChat 复用,行为完全一致。
 * 包含:消息状态 + localStorage 持久化、Ollama 状态探测、流式 sendMessage、
 * 清空、Enter 发送、模型选择、SYSTEM_PROMPT / STORAGE_KEY / MODEL_KEY。
 */
export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [mounted, setMounted] = useState(false);
  const [ollamaOnline, setOllamaOnline] = useState(false);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState("qwen2.5");
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setMounted(true);
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

    const userMsg: ChatMessage = {
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

      const assistantMsg: ChatMessage = {
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

  const selectModel = useCallback((name: string) => {
    setSelectedModel(name);
    localStorage.setItem(MODEL_KEY, name);
    setShowModelPicker(false);
  }, []);

  return {
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
    selectModel,
  };
}

export default useChat;
