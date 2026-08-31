"use client";

import { Bell } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export interface MessagesCardProps {
  unreadCount: number;
  latestMessage?: { title: string } | null;
  onClick: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void;
}

export function MessagesCard({
  unreadCount,
  latestMessage,
  onClick,
  onKeyDown,
}: MessagesCardProps) {
  return (
    <Card
      className="p-4 mb-4 cursor-pointer hover:bg-accent/50"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Bell className="w-4 h-4 text-primary" />
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center"
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </Badge>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-foreground">
                消息通知
              </span>
              {unreadCount > 0 && (
                <Badge variant="secondary" className="text-[11px]">
                  {unreadCount} 条未读
                </Badge>
              )}
            </div>
            {latestMessage ? (
              <p className="text-[12px] text-muted-foreground truncate">
                最新：{latestMessage.title}
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                预约提醒、违规通知、系统公告
              </p>
            )}
          </div>
        </div>
        <Button variant="ghost" className="text-xs shrink-0 ml-2">
          查看
        </Button>
      </div>
    </Card>
  );
}
