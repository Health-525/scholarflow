"use client";

import { Code, Sparkles } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/layout/PageHeader";
import { MORE_PAGE_GROUPS } from "@/config/navigation";
import { APP_VERSION } from "@/lib/version";

interface ExternalLinkItem {
  href: string;
  title: string;
  description: string;
  Icon: React.ComponentType<{ className?: string }>;
}

const EXTERNAL_LINKS: ExternalLinkItem[] = [
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
        {MORE_PAGE_GROUPS.map((group) => (
          <section key={group.label}>
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground tracking-wide">
              {group.label}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group flex items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:border-primary/10"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-foreground">{item.label}</h3>
                      <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                        {item.description ?? ""}
                      </p>
                    </div>
                  </Link>
                );
              })}
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
