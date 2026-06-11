"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAssignmentsQuery } from "@/hooks/useQueries";
import { classifyUrgency } from "@/lib/assignment-utils";
import { ErrorFallback } from "@/components/ui/ErrorFallback";

// Urgency config — light mode colors (original) + dark mode overrides (slate palette)
const URGENCY_CONFIG = {
  overdue:  { label: "已逾期", colorClass: "text-red-500",   bgClass: "bg-red-500/8",  dotClass: "bg-red-600", barClass: "bg-red-500",   darkColor: "#EF4444", darkBg: "rgba(239,68,68,0.10)", darkDot: "#EF4444", darkBorder: "rgba(239,68,68,0.20)" },
  urgent:   { label: "紧急",   colorClass: "text-amber-600", bgClass: "bg-amber-500/8", dotClass: "bg-amber-600", barClass: "bg-amber-500", darkColor: "#F59E0B", darkBg: "rgba(245,158,11,0.10)", darkDot: "#F59E0B", darkBorder: "transparent" },
  reminder: { label: "即将到", colorClass: "text-amber-500", bgClass: "bg-amber-400/8", dotClass: "bg-amber-500", barClass: "bg-amber-400", darkColor: "#F59E0B", darkBg: "rgba(245,158,11,0.08)", darkDot: "#F59E0B", darkBorder: "transparent" },
  normal:   { label: "",       colorClass: "text-muted-foreground", bgClass: "bg-secondary", dotClass: "bg-border", barClass: "bg-primary/30", darkColor: "", darkBg: "", darkDot: "", darkBorder: "transparent" },
};

export function AssignmentsCard() {
  const { assignments, isLoading, error, reload } = useAssignmentsQuery();
  const pending = assignments.filter((a) => !a.done).slice(0, 5);
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const check = () => {
      const theme = document.documentElement.getAttribute("data-theme");
      if (theme === "dark") setIsDark(true);
      else if (theme === "light") setIsDark(false);
      else setIsDark(window.matchMedia("(prefers-color-scheme: dark)").matches);
    };
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="rounded-2xl p-4 bg-card border border-border dark:border-transparent shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-amber-500/10">
            <svg className="w-3.5 h-3.5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 00-2 2m6 0a2 2 0 002 2" />
            </svg>
          </div>
          <h2 className="text-[13px] font-semibold tracking-wide font-display text-foreground">
            待办作业
          </h2>
          {mounted && !isLoading && pending.length > 0 && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/10 text-amber-600" aria-label={`${pending.length} 项待办`}>
              {pending.length}
            </span>
          )}
        </div>
        <Link
          href="/assignments"
          className="text-[11px] tracking-wide transition-colors hover:opacity-70 text-primary"
          aria-label="查看全部作业"
        >
          查看全部 →
        </Link>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="skeleton h-8 rounded-xl" />)}
        </div>
      )}

      {error && !isLoading && <ErrorFallback message={error.message} onRetry={reload} />}

      {!isLoading && !error && (
        pending.length === 0 ? (
          <div className="py-4 flex items-center justify-center gap-2">
            <span className="text-lg" aria-hidden="true">✨</span>
            <p className="text-[13px] text-muted-foreground">暂无待办作业</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {pending.map((a) => {
              const urgency = classifyUrgency(a.deadline, new Date());
              const cfg = URGENCY_CONFIG[urgency];
              const deadlineDate = new Date(a.deadline);
              const now = new Date();
              const diffMs = deadlineDate.getTime() - now.getTime();
              const diffDays = Math.ceil(diffMs / 86400000);

              // For normal urgency, use Tailwind classes (works in both modes)
              // For other urgencies, use inline styles with dark mode overrides
              const isNormal = urgency === "normal";

              const bgColor = isDark && !isNormal ? cfg.darkBg : undefined;
              const borderColor = isDark && !isNormal ? cfg.darkBorder : (urgency === "overdue" ? "rgba(192,57,43,0.15)" : "transparent");
              const dotColor = isDark && !isNormal ? cfg.darkDot : undefined;
              const textColor = isDark && !isNormal ? cfg.darkColor : undefined;

              return (
                <div
                  key={a.id}
                  className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 transition-all duration-200 hover:shadow-sm ${isNormal ? cfg.bgClass : ""}`}
                  style={isNormal ? { border: "1px solid transparent" } : {
                    background: bgColor || undefined,
                    border: `1px solid ${borderColor}`,
                  }}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${isNormal ? cfg.dotClass : ""}`}
                    style={isNormal ? undefined : { background: dotColor || cfg.dotClass.replace("bg-", "") }}
                    aria-hidden="true"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-[12.5px] truncate block text-foreground">
                      <span className="text-muted-foreground">{a.subject}</span>
                      <span className="text-muted-foreground/40 mx-1">·</span>
                      {a.title}
                    </span>
                  </div>
                  <div className="text-right shrink-0 flex items-center gap-1">
                    {cfg.label && (
                      <span
                        className={`text-[10px] font-semibold ${isNormal ? cfg.colorClass : ""}`}
                        style={isNormal ? undefined : { color: textColor }}
                      >
                        {cfg.label}
                      </span>
                    )}
                    <span
                      className={`text-[11px] tabular-nums ${urgency === "normal" ? "text-muted-foreground" : ""}`}
                      style={urgency === "normal" ? undefined : { color: textColor }}
                    >
                      {diffDays <= 0 ? "今天" : diffDays === 1 ? "明天" : `${diffDays}天`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}

export default AssignmentsCard;
