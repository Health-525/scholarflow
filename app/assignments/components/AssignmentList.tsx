"use client";

import { ChevronDown, ClipboardList, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";
import type { Assignment } from "@/types";

import { classifyAssignment, type Filter } from "../utils";

import { AssignmentItem } from "./AssignmentItem";

export function AssignmentList({
  assignments,
  filter,
  onMarkDone,
  onDelete,
  onResetFilter,
}: {
  assignments: Assignment[];
  filter: Filter;
  onMarkDone: (id: string) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
  onResetFilter: () => void;
}) {
  const [showCompleted, setShowCompleted] = useState(false);

  const now = Date.now();
  const overdue = assignments.filter((a) => classifyAssignment(a, now) === "overdue");
  const today = assignments.filter((a) => classifyAssignment(a, now) === "today");
  const future = assignments.filter((a) => classifyAssignment(a, now) === "future");
  const completed = assignments.filter((a) => a.done);
  const pending = [...overdue, ...today, ...future];

  // 没有待完成时自动展开已完成
  useEffect(() => {
    if (pending.length === 0 && completed.length > 0) {
      setShowCompleted(true);
    }
  }, [pending.length, completed.length]);

  const groups: { title: string; items: Assignment[]; collapsible?: boolean }[] = [];
  switch (filter) {
    case "pending":
      groups.push({ title: "待完成", items: pending });
      break;
    case "today":
      groups.push({ title: "今天截止", items: today });
      break;
    case "overdue":
      groups.push({ title: "已逾期", items: overdue });
      break;
    case "completed":
      groups.push({ title: "已完成", items: completed });
      break;
    default:
      groups.push({ title: "待完成", items: pending });
      groups.push({ title: "已完成", items: completed, collapsible: true });
  }

  const totalVisible = groups.reduce((sum, g) => sum + g.items.length, 0);

  const filterLabels: Record<Filter, string> = {
    all: "全部",
    pending: "待完成",
    today: "今天截止",
    overdue: "已逾期",
    completed: "已完成",
  };

  if (assignments.length === 0) {
    return null;
  }

  if (totalVisible === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="没有符合条件的作业"
        description="点击下方按钮清除筛选"
        action={{ label: "显示全部", onClick: onResetFilter }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {filter !== "all" && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 text-sm">
          <span className="text-muted-foreground">当前筛选：</span>
          <Badge variant="secondary" className="gap-1">
            {filterLabels[filter]}
            <button
              onClick={onResetFilter}
              className="ml-1 hover:text-foreground transition-colors"
              aria-label="清除筛选"
            >
              <X size={12} />
            </button>
          </Badge>
          <span className="text-muted-foreground text-xs ml-auto">
            {totalVisible} 项结果
          </span>
        </div>
      )}

      {groups.map(
        (group, index) =>
          group.items.length > 0 && (
            <Card hover={false} key={group.title} className={index > 0 ? "mt-4" : ""}>
              <CardHeader className="pb-3">
                {group.collapsible ? (
                  <button
                    type="button"
                    onClick={() => setShowCompleted((v) => !v)}
                    className="flex w-full items-center justify-between text-left"
                  >
                    <CardTitle className="text-sm font-semibold text-muted-foreground">
                      {group.title}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {group.items.length} 项
                      </Badge>
                      <ChevronDown
                        className={cn(
                          "size-4 text-muted-foreground transition-transform duration-200",
                          showCompleted && "rotate-180"
                        )}
                      />
                    </div>
                  </button>
                ) : (
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold">{group.title}</CardTitle>
                    <Badge variant="secondary" className="text-xs">
                      {group.items.length} 项
                    </Badge>
                  </div>
                )}
              </CardHeader>
              {(!group.collapsible || showCompleted) && (
                <CardContent className="space-y-2">
                  {group.items.map((a) => (
                    <AssignmentItem
                      key={a.id}
                      a={a}
                      now={now}
                      type={classifyAssignment(a, now)}
                      onMarkDone={onMarkDone}
                      onDelete={onDelete}
                    />
                  ))}
                </CardContent>
              )}
            </Card>
          )
      )}
    </div>
  );
}
