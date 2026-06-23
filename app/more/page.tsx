"use client";

import { ChevronRight, FileText, Settings, Sparkles } from "lucide-react";
import Link from "next/link";

export default function MorePage() {
  return (
    <div className="max-w-5xl mx-auto min-h-[60vh] px-4 py-10 animate-page">
      <div className="grid gap-4 md:grid-cols-3">
        {[
          {
            href: "/settings",
            title: "账号与设置",
            description: "管理账号、安全、主题与同步。",
            Icon: Settings,
          },
          {
            href: "/notes",
            title: "笔记中心",
            description: "查看与整理学习笔记。",
            Icon: FileText,
          },
          {
            href: "/goals",
            title: "目标与成长",
            description: "追踪目标、习惯和学习进度。",
            Icon: Sparkles,
          },
        ].map(({ href, title, description, Icon }) => (
          <Link
            key={href}
            href={href}
            className="rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <h1 className="text-lg font-bold font-display text-foreground">{title}</h1>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{description}</p>
            <div className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-primary">
              进入
              <ChevronRight className="h-4 w-4" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
