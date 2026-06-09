"use client";

import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, RefreshCw, Loader2, Bell, Trash2, Check } from "lucide-react";
import { useRouter } from "next/navigation";

interface Message {
  title: string;
  content: string;
  create_time: string;
  isread: number;
  isused: number;
}

export default function LibraryMessagesPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState(1);
  const [deleting, setDeleting] = useState<number | null>(null);

  const fetchMessages = useCallback(() => {
    setLoading(true); setError(null);
    fetch(`/api/library/messages?page=1&num=50&type=${type}`)
      .then(r => {
        if (r.status === 401) return Promise.reject(new Error("JWT_EXPIRED"));
        if (r.status === 403) return Promise.reject(new Error("access_denied"));
        return r.json();
      })
      .then(json => {
        if (json.error) throw new Error(json.error);
        setMessages(json.messages || []);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [type]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  const unreadCount = messages.filter(m => m.isread === 0).length;

  const handleDelete = async (index: number) => {
    setDeleting(index);
    // API: message.delete(messageId: Int!) — but we don't have message IDs
    // For now just remove from UI
    setTimeout(() => {
      setMessages(prev => prev.filter((_, i) => i !== index));
      setDeleting(null);
    }, 300);
  };

  const handleMarkAllRead = () => {
    setMessages(prev => prev.map(m => ({ ...m, isread: 1 })));
  };

  return (
    <div className="pb-24 md:pb-8 py-6 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/library")} className="p-2 rounded-xl bg-card border border-border text-muted-foreground">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-foreground">消息通知</h1>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-primary text-primary-foreground">
                {unreadCount}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button onClick={handleMarkAllRead} title="全部已读"
              className="p-2 rounded-xl bg-card border border-border text-muted-foreground">
              <Check className="w-4 h-4" />
            </button>
          )}
          <button onClick={fetchMessages} className="p-2 rounded-xl bg-card border border-border text-muted-foreground">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tab */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => setType(1)}
          className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${type === 1 ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground"}`}>
          系统通知
        </button>
        <button onClick={() => setType(2)}
          className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${type === 2 ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground"}`}>
          预约通知
        </button>
        <button onClick={() => setType(0)}
          className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${type === 0 ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground"}`}>
          全部
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-16 text-center">
          <Loader2 className="w-6 h-6 mx-auto animate-spin text-primary" />
          <div className="text-[13px] mt-2 text-muted-foreground">加载中...</div>
        </div>
      ) : error ? (
        <div className="py-16 text-center">
          <p className="text-[13px] text-red-500">{error === "access_denied" ? "凭证无效，请返回刷新" : error}</p>
          <button onClick={fetchMessages} className="mt-4 px-4 py-2 rounded-xl text-[13px] font-medium bg-primary text-primary-foreground">
            重试
          </button>
        </div>
      ) : messages.length === 0 ? (
        <div className="py-16 text-center">
          <Bell className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-[13px] text-muted-foreground">暂无消息</p>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((msg, i) => (
            <div key={i} className={`rounded-xl p-4 bg-card border transition-all ${msg.isread === 0 ? "border-primary/30 bg-primary/5" : "border-border"} ${deleting === i ? "opacity-0 scale-95" : "opacity-100 scale-100"}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {msg.isread === 0 && (
                    <span className="shrink-0 w-2 h-2 rounded-full bg-primary mt-1.5" />
                  )}
                  <span className="text-sm font-medium text-foreground truncate">{msg.title}</span>
                </div>
                <button onClick={() => handleDelete(i)} className="shrink-0 p-1 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-[12px] text-muted-foreground leading-relaxed mt-1 ml-4">{msg.content}</p>
              <p className="text-[11px] text-muted-foreground/60 mt-2 ml-4">
                {msg.create_time}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
