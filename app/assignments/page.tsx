"use client";

import { ClipboardList } from "lucide-react";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorFallback } from "@/components/ui/ErrorFallback";
import { ListSkeleton } from "@/components/ui/skeleton";
import { useAssignmentsQuery, useScheduleQuery } from "@/hooks/useQueries";

import {
  AssignmentList,
  AssignmentStats,
  QuickCaptureForm,
} from "./components";
import { formatDateLabel, type Filter } from "./utils";

export default function AssignmentsPage() {
  const {
    assignments,
    isLoading,
    error,
    add,
    markDone,
    delete: deleteAssignment,
    reload,
  } = useAssignmentsQuery();
  const { data: scheduleData } = useScheduleQuery();
  const schedule = scheduleData?.schedule;
  const [filter, setFilter] = useState<Filter>("all");

  const subjects = useMemo(() => {
    const titles = schedule?.courses?.map((c: { title: string }) => c.title) ?? [];
    const assignmentSubjects = assignments.map((a) => a.subject).filter(Boolean);
    return Array.from(new Set([...titles, ...assignmentSubjects]))
      .filter((s): s is string => Boolean(s))
      .sort();
  }, [schedule, assignments]);

  const headerDescription = useMemo(() => {
    const pending = assignments.filter((a) => !a.done).length;
    const status = pending === 0 ? "所有作业已完成" : `还剩 ${pending} 项作业`;
    return `${formatDateLabel()} · ${status}`;
  }, [assignments]);

  return (
    <div className="max-w-3xl mx-auto min-h-screen bg-background text-foreground pb-24 md:pb-8">
      <PageHeader
        icon={<ClipboardList className="size-5 text-primary" />}
        title="作业"
        description={headerDescription}
      />

      <div className="space-y-5">
        {isLoading && (
          <Card hover={false} className="p-4">
            <ListSkeleton count={4} />
          </Card>
        )}

        {error && !isLoading && <ErrorFallback message={error.message} onRetry={reload} />}

        {!isLoading && !error && (
          <>
            <AssignmentStats assignments={assignments} filter={filter} onFilter={setFilter} />

            <QuickCaptureForm subjects={subjects} onAdd={add} />

            {assignments.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title="暂无待办作业"
                description="在上方添加第一项作业，开始规划你的学习任务"
              />
            ) : (
              <AssignmentList
                assignments={assignments}
                filter={filter}
                onMarkDone={markDone}
                onDelete={deleteAssignment}
                onResetFilter={() => setFilter("all")}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
