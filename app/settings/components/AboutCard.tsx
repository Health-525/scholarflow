"use client";

import { Info } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function AboutCard() {
  return (
    <Card className="mb-4 hover:translate-y-0 hover:shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-primary" />
          <CardTitle className="text-[13px] font-semibold">关于</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="text-center">
        <div className="text-[14px] font-semibold mb-1 text-primary font-display">
          ScholarFlow
        </div>
        <div className="text-[11px] text-muted-foreground">
          v2.0 · Electron + Next.js
        </div>
        <div className="text-[11px] mt-0.5 text-muted-foreground">
          独立学习管理中枢
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5 justify-center">
          <Badge
            variant="secondary"
            className="text-[11px] px-2 py-0.5 rounded-md bg-[var(--status-success)]/10 text-[var(--status-success)] font-medium hover:bg-[var(--status-success)]/10"
          >
            PWA
          </Badge>
          <Badge
            variant="secondary"
            className="text-[11px] px-2 py-0.5 rounded-md bg-[var(--status-warning)]/10 text-[var(--status-warning)] font-medium hover:bg-[var(--status-warning)]/10"
          >
            离线优先
          </Badge>
          <Badge
            variant="secondary"
            className="text-[11px] px-2 py-0.5 rounded-md bg-primary/10 text-primary font-medium hover:bg-primary/10"
          >
            SQLite
          </Badge>
        </div>
        <div className="mt-3 text-[11px] text-muted-foreground">
          按{" "}
          <kbd className="px-1 py-0.5 rounded text-[11px] font-mono bg-secondary border border-border">
            ?
          </kbd>{" "}
          查看快捷键
        </div>
      </CardContent>
    </Card>
  );
}
