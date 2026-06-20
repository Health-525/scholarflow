"use client";

import { Capacitor } from "@capacitor/core";
import { useCallback, useEffect, useRef, useState } from "react";


import { HttpBackend, type ChatBackend, type ChatMessage as WireMessage } from "@/lib/chat/backend";
import type { ModelState } from "@/lib/chat/model-controller";
import { getModelState, reloadModel, subscribeModel } from "@/lib/chat/model-singleton";
import { NativeBackend } from "@/lib/chat/native-backend";
import { ScholarLLM } from "@/lib/chat/scholar-llm-plugin";

// 平台分流：手机端(iOS/Android 原生)走端侧 MNN(NativeBackend)，桌面/Web 走 /api/chat(HttpBackend)。
const backend: ChatBackend = Capacitor.isNativePlatform()
  ? new NativeBackend(ScholarLLM)
  : new HttpBackend();

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
  const isNative = Capacitor.isNativePlatform();
  const [modelState, setModelState] = useState<ModelState>(() => getModelState());

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

  // Web/桌面探测 Ollama；原生平台无 /api/chat，改为订阅端侧模型加载状态。
  useEffect(() => {
    if (isNative) return subscribeModel(setModelState);
    checkOllama();
  }, [checkOllama, isNative]);

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
      const chatMessages: WireMessage[] = [
        { role: "system", content: SYSTEM_PROMPT },
        ...newMessages.map(m => ({ role: m.role, content: m.content })),
      ];

      const fullContent = await backend.send(chatMessages, {
        model: selectedModel,
        onToken: (delta) => setStreamingContent((prev) => prev + delta),
      });

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

  // 统一"就绪"信号：原生看端侧模型是否加载完成，Web/桌面看 Ollama 在线。
  const ready = isNative ? modelState.phase === "ready" : ollamaOnline;

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
    ready,
    isNative,
    modelPhase: modelState.phase,
    modelError: modelState.error,
    reloadModel,
  };
}

export default useChat;
