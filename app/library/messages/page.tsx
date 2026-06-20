"use client";

import {
  ArrowLeft,
  RefreshCw,
  Loader2,
  Bell,
  Trash2,
  Check,
  AlertCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback, useRef } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/EmptyState";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { sanitizeHtml } from "@/lib/sanitize";
import { cn } from "@/lib/utils";

interface Message {
  message_id: number;
  title: string;
  content: string;
  create_time: string;
  isread: number;
  isused: number;
}

function formatMessageTime(input: string | number | undefined): string {
  if (!input) return "";
  const ts = typeof input === "number" ? input * 1000 : Date.parse(input);
  if (Number.isNaN(ts)) return String(input);
  return new Date(ts).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function LibraryMessagesPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState(1);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [marking, setMarking] = useState(false);

  const fetchMessages = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/library/messages?page=1&num=50&type=${type}`)
      .then((r) => {
        if (r.status === 401) return Promise.reject(new Error("JWT_EXPIRED"));
        if (r.status === 403) return Promise.reject(new Error("access_denied"));
        return r.json();
      })
      .then((json) => {
        if (json.error) throw new Error(json.error);
        setMessages(json.messages || []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [type]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // 进入消息页后自动将未读消息同步标记为已读
  const autoMarkedRef = useRef(false);
  useEffect(() => {
    if (autoMarkedRef.current) return;
    const unread = messages.filter((m) => m.isread === 0);
    if (unread.length === 0) return;
    autoMarkedRef.current = true;
    setMarking(true);
    fetch("/api/library/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, ids: unread.map((m) => m.message_id) }),
    })
      .then((r) => r.json())
      .then(() => fetchMessages())
      .catch(() => setMarking(false));
  }, [messages, type, fetchMessages]);

  const unreadCount = messages.filter((m) => m.isread === 0).length;

  const handleDelete = async (index: number) => {
    setDeleting(index);
    // 图书馆后端暂未提供删除消息接口，先在本地移除
    setTimeout(() => {
      setMessages((prev) => prev.filter((_, i) => i !== index));
      setDeleting(null);
    }, 300);
  };

  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return;
    setMarking(true);
    try {
      const r = await fetch("/api/library/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const json = await r.json();
      if (json.error) throw new Error(json.error);
      await fetchMessages();
    } catch (e) {
      setError(e instanceof Error ? e.message : "标记失败");
    } finally {
      setMarking(false);
    }
  };

  return (
    <div className="pb-24 md:pb-8 py-6 px-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.push("/library")}
          aria-label="返回图书馆"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <PageHeader
            icon={<Bell className="w-5 h-5 text-primary" />}
            title="消息通知"
            description="系统公告与预约提醒"
            actions={
              <div className="flex items-center gap-2 shrink-0">
                {unreadCount > 0 && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleMarkAllRead}
                    disabled={marking}
                    title="全部已读"
                    aria-label="全部已读"
                  >
                    {marking ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={fetchMessages}
                  aria-label="刷新"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            }
          />
        </div>
      </div>

      {/* Type tabs */}
      <SegmentedControl
        className="mb-4"
        options={[
          { id: "1", label: "系统通知" },
          { id: "2", label: "预约通知" },
          { id: "0", label: "全部" },
        ]}
        value={String(type)}
        onChange={(id) => setType(Number(id))}
      />

      {unreadCount > 0 && (
        <Badge variant="secondary" className="mb-3 text-[11px]">
          {unreadCount} 条未读
        </Badge>
      )}

      {/* Content */}
      {loading ? (
        <div className="py-16 text-center">
          <Loader2 className="w-6 h-6 mx-auto animate-spin text-primary" />
          <div className="text-[13px] mt-2 text-muted-foreground">
            加载中...
          </div>
        </div>
      ) : error ? (
        <div className="max-w-md mx-auto py-16 px-4 text-center">
          <EmptyState
            icon={AlertCircle}
            title="加载失败"
            description={
              error === "access_denied" ? "凭证无效，请返回刷新" : error
            }
          />
          <Button className="mt-4" onClick={fetchMessages}>
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            重试
          </Button>
        </div>
      ) : messages.length === 0 ? (
        <div className="max-w-md mx-auto py-16 px-4">
          <EmptyState
            icon={Bell}
            title="暂无消息"
            description="系统通知和预约提醒会显示在这里"
          />
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((msg, i) => (
            <Card
              key={msg.message_id}
              hover={false}
              className={cn(
                "p-4 transition-all",
                msg.isread === 0
                  ? "border-primary/30 bg-primary/5"
                  : "border-border",
                deleting === i && "opacity-0 scale-95",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {msg.isread === 0 && (
                    <span className="shrink-0 w-2 h-2 rounded-full bg-primary mt-1.5" />
                  )}
                  <span className="text-sm font-medium text-foreground truncate">
                    {msg.title}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(i)}
                  aria-label="删除消息"
                  className="shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
              <div
                className="text-[12px] text-muted-foreground leading-relaxed mt-2 ml-4 prose prose-sm max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(msg.content) }}
              />
              <p className="text-[11px] text-muted-foreground/60 mt-2 ml-4">
                {formatMessageTime(msg.create_time)}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
