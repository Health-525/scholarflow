"use client";

import { LayoutGrid } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { AssignmentsCard } from "@/components/dashboard/AssignmentsCard";
import { ExamCountdownCard } from "@/components/dashboard/ExamCountdownCard";
import { JwcNewsCard } from "@/components/dashboard/JwcNewsCard";
import { RecentDailyCard } from "@/components/dashboard/RecentDailyCard";
import { RunningCard } from "@/components/dashboard/RunningCard";
import { ScheduleCard } from "@/components/dashboard/ScheduleCard";
import { ScreenTimeCard } from "@/components/dashboard/ScreenTimeCard";
import { SummaryBanner } from "@/components/dashboard/SummaryBanner";
import { SortableList } from "@/components/ui/SortableList";

interface Section {
  id: string;
  label: string;
  content: ReactNode;
}

const LS_KEY = "sf_dashboard_order";

const DEFAULT_SECTIONS: Section[] = [
  {
    id: "summary",
    label: "快捷统计",
    content: <SummaryBanner />,
  },
  {
    id: "focus",
    label: "今日焦点",
    content: <ScheduleCard />,
  },
  {
    id: "tasks",
    label: "任务与健康",
    content: (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AssignmentsCard />
        <RunningCard />
      </div>
    ),
  },
  {
    id: "tracking",
    label: "数据追踪",
    content: (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ScreenTimeCard />
        <ExamCountdownCard />
        <RecentDailyCard />
      </div>
    ),
  },
  {
    id: "news",
    label: "信息浏览",
    content: <JwcNewsCard />,
  },
];

function loadOrder(): string[] | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return null;
}

function saveOrder(order: string[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(order)); } catch { /* ignore */ }
}

export function SortableDashboard() {
  const [sections, setSections] = useState<Section[]>(DEFAULT_SECTIONS);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const order = loadOrder();
    if (order) {
      const map = new Map(DEFAULT_SECTIONS.map((s) => [s.id, s]));
      const next: Section[] = [];
      for (const id of order) {
        const s = map.get(id);
        if (s) { next.push(s); map.delete(id); }
      }
      // 新增的 section 放最后
      for (const s of map.values()) next.push(s);
      setSections(next);
    }
    setMounted(true);
  }, []);

  const handleReorder = (next: Section[]) => {
    setSections(next);
    saveOrder(next.map((s) => s.id));
  };

  if (!mounted) {
    return (
      <div className="space-y-4">
        {DEFAULT_SECTIONS.map((s) => (
          <div key={s.id} className="space-y-2.5">
            <div className="flex items-center gap-2 px-1">
              <span className="text-[11px] font-semibold tracking-[0.15em] text-muted-foreground/60 uppercase">{s.label}</span>
            </div>
            {s.content}
          </div>
        ))}
      </div>
    );
  }

  return (
    <SortableList
      items={sections}
      onReorder={handleReorder}
      showGrip={true}
      itemClassName="group/section space-y-2.5"
      renderItem={(s) => (
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 px-1">
            <LayoutGrid className="w-3 h-3 text-muted-foreground/40 opacity-0 group-hover/section:opacity-100 transition-opacity duration-200" />
            <span className="w-[3px] h-[10px] rounded-full bg-primary/30" aria-hidden="true" />
            <span className="text-[11px] font-semibold tracking-[0.15em] text-muted-foreground/60 uppercase">{s.label}</span>
          </div>
          {s.content}
        </div>
      )}
      renderDragOverlay={(s) => (
        <div className="space-y-2.5 opacity-90 scale-[1.01]">
          <div className="flex items-center gap-2 px-1">
            <span className="text-[11px] font-semibold tracking-[0.15em] text-muted-foreground/60 uppercase">{s.label}</span>
          </div>
          <div className="rounded-2xl bg-card border border-border shadow-lg p-4">
            {s.label}
          </div>
        </div>
      )}
    />
  );
}
