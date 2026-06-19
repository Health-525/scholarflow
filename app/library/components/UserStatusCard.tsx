"use client";

import { AlertCircle } from "lucide-react";

import { Card } from "@/components/ui/card";

export interface UserStatusCardProps {
  blacklisted?: boolean;
}

export function UserStatusCard({ blacklisted }: UserStatusCardProps) {
  if (!blacklisted) return null;

  return (
    <Card className="p-4 mb-4 border-destructive/20 bg-destructive/5 animate-fade-up">
      <div className="flex items-center gap-2 mb-1">
        <AlertCircle className="w-4 h-4 text-destructive" />
        <span className="text-[13px] font-semibold text-destructive">
          账号受限
        </span>
      </div>
      <p className="text-[12px] text-muted-foreground">
        当前账号处于黑名单状态，无法进行预约操作。请联系图书馆管理员解除限制。
      </p>
    </Card>
  );
}
