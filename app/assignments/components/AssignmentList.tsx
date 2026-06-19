"use client";

import { ClipboardList, RotateCcw, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Assignment, AssignmentDraft } from "@/types";

import { classifyAssignment, type Filter } from "../utils";
import { AssignmentItem } from "./AssignmentItem";

export function AssignmentList({
  assignments,
  filter,
  subjects,
  onMarkDone,
  onUpdate,
  onDelete,
  undoBuffer,
  onUndo,
  onResetFilter,
}: {
  assignments: Assignment[];
  filter: Filter;
  subjects: string[];
  onMarkDone: (id: string) => Promise<unknown>;
  onUpdate: (id: string, draft: AssignmentDraft) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
  undoBuffer: { assignment: Assignment; expiresAt: number } | null;
  onUndo: () => Promise<void>;
  onResetFilter: () => void;
}) {
  const now = Date.now();
  const overdue = assignments.filter((a) => classifyAssignment(a, now) === "overdue");
  const today = assignments.filter((a) => classifyAssignment(a, now) === "today");
  const future = assignments.filter((a) => classifyAssignment(a, now) === "future");
  const completed = assignments.filter((a) => a.done);
  const pending = [...overdue, ...today, ...future];

  const visibleGroups = (() => {
    switch (filter) {
      case "pending":
        return [{ title: "待完成", items: pending }];
      case "today":
        return [{ title: "今天截止", items: today }];
      case "overdue":
        return [{ title: "已逾期", items: overdue }];
      case "completed":
        return [{ title: "已完成", items: completed }];
      default:
        return [
          { title: "待完成", items: pending },
          { title: "已完成", items: completed },
        ];
    }
  })();

  const totalVisible = visibleGroups.reduce((sum, g) => sum + g.items.length, 0);

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

      {undoBuffer && Date.now() < undoBuffer.expiresAt && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 animate-fade-up shadow-sm">
          <div className="flex-1 min-w-0">
            <span className="font-medium">已完成</span>
            <span className="ml-1 truncate">「{undoBuffer.assignment.title}」</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onUndo}
            className="gap-1.5 border-emerald-500/30 hover:bg-emerald-500/10 shrink-0"
          >
            <RotateCcw size={14} />
            撤销
          </Button>
        </div>
      )}

      {visibleGroups.map(
        (group, index) =>
          group.items.length > 0 && (
            <Card hover={false} key={group.title} className={index > 0 ? "mt-4" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">{group.title}</CardTitle>
                  <Badge variant="secondary" className="text-xs">
                    {group.items.length} 项
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {group.items.map((a) => (
                  <AssignmentItem
                    key={a.id}
                    a={a}
                    now={now}
                    type={classifyAssignment(a, now)}
                    subjects={subjects}
                    onMarkDone={onMarkDone}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                  />
                ))}
              </CardContent>
            </Card>
          )
      )}
    </div>
  );
}
