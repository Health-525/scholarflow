"use client";

import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Brain,
  Calculator,
  CalendarDays,
  Clock,
  FileText,
  Flag,
  Code,
  LayoutDashboard,
  Monitor,
  Newspaper,
  Settings,
  Sparkles,
  Target,
  Timer,
} from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/layout/PageHeader";
import { APP_VERSION } from "@/lib/version";

interface FeatureItem {
  href: string;
  title: string;
  description: string;
  Icon: LucideIcon;
}

interface FeatureGroup {
  label: string;
  items: FeatureItem[];
}

const FEATURE_GROUPS: FeatureGroup[] = [
  {
    label: "学业",
    items: [
      { href: "/", title: "仪表盘", description: "一屏掌握课表、作业、考试与状态", Icon: LayoutDashboard },
      { href: "/schedule", title: "课表", description: "本周网格、今日视图与调课管理", Icon: CalendarDays },
      { href: "/assignments", title: "作业", description: "快速录入、完成追踪与截止日期提醒", Icon: FileText },
      { href: "/exams", title: "考试", description: "考试安排与倒计时", Icon: Clock },
      { href: "/gpa", title: "绩点", description: "GPA 统计与学期成绩趋势", Icon: Calculator },
    ],
  },
  {
    label: "成长",
    items: [
      { href: "/goals", title: "目标", description: "每日目标与连续打卡", Icon: Target },
      { href: "/reports/daily", title: "日报", description: "每日学习总结与反思", Icon: Newspaper },
      { href: "/reports/weekly", title: "周报", description: "基于日报和作业自动生成周报", Icon: Flag },
    ],
  },
  {
    label: "专注",
    items: [
      { href: "/pomodoro", title: "番茄钟", description: "专注 / 休息循环计时", Icon: Timer },
      { href: "/notes", title: "笔记", description: "Markdown 笔记与全文搜索", Icon: BookOpen },
      { href: "/activity", title: "屏幕时间", description: "桌面端应用使用统计", Icon: Monitor },
    ],
  },
  {
    label: "生活与其他",
    items: [
      { href: "/chat", title: "AI 助手", description: "整理笔记、检查作业与答疑", Icon: Brain },
      { href: "/settings", title: "设置", description: "账号、数据导出与主题", Icon: Settings },
    ],
  },
];

const EXTERNAL_LINKS: FeatureItem[] = [
  { href: "https://github.com/Health-525/scholarflow", title: "开源仓库", description: "查看源码、提交 Issue 与功能建议", Icon: Code },
];

export default function MorePage() {
  return (
    <div className="max-w-5xl mx-auto min-h-[60vh] px-4 py-6">
      <PageHeader
        icon={<Sparkles className="w-5 h-5 text-primary" />}
        title="全部功能"
        description="ScholarFlow 功能总览与快捷入口"
      />

      <div className="space-y-8">
        {FEATURE_GROUPS.map((group) => (
          <section key={group.label}>
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground tracking-wide">
              {group.label}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.items.map(({ href, title, description, Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="group flex items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:border-primary/10"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-foreground">{title}</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                      {description}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}

        <section>
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground tracking-wide">
            帮助与反馈
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {EXTERNAL_LINKS.map(({ href, title, description, Icon }) => (
              <a
                key={title}
                href={href}
                target={href.startsWith("http") ? "_blank" : undefined}
                rel={href.startsWith("http") ? "noreferrer" : undefined}
                aria-label={`${title}${href.startsWith("http") ? "（在新窗口打开）" : ""}`}
                className="group flex items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:border-primary/10"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary/50 text-secondary-foreground">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-foreground">{title}</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                    {description}
                  </p>
                </div>
              </a>
            ))}
          </div>
        </section>

        <footer className="pt-4 text-center text-xs text-muted-foreground">
          {`ScholarFlow v${APP_VERSION} · 本地优先的校园学习工作台`}
        </footer>
      </div>
    </div>
  );
}
