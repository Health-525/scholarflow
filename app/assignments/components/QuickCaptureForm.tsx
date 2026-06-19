"use client";

import { ChevronDown, Plus, Sparkles } from "lucide-react";
import { useCallback, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { DatePicker, TimePicker } from "@/components/ui/datetime-picker";
import { Input } from "@/components/ui/input";
import { SubjectSelector } from "@/components/ui/subject-selector";
import { showToast } from "@/components/ui/ToastContainer";
import { cn } from "@/lib/utils";
import type { Assignment, AssignmentDraft } from "@/types";

import { tomorrowDate, dateToDeadline } from "../utils";

export function QuickCaptureForm({
  subjects,
  onAdd,
}: {
  subjects: string[];
  onAdd: (d: AssignmentDraft) => Promise<Assignment[]>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState(subjects[0] || "");
  const [deadline, setDeadline] = useState(tomorrowDate());
  const [time, setTime] = useState("23:59");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const canSubmit = Boolean(title.trim() && subject.trim());

  const reset = useCallback(() => {
    setTitle("");
    setSubject(subjects[0] || "");
    setDeadline(tomorrowDate());
    setTime("23:59");
  }, [subjects]);

  const toggle = () => {
    setExpanded((v) => {
      if (!v) setTimeout(() => inputRef.current?.focus(), 200);
      return !v;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await onAdd({
        subject: subject.trim(),
        title: title.trim(),
        deadline: dateToDeadline(deadline, time),
      });
      showToast("success", "作业已添加");
      reset();
      setExpanded(false);
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "添加失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative">
      {/* 顶部渐变光效 */}
      <div
        className={cn(
          "absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 opacity-0 blur-sm transition-opacity duration-500 pointer-events-none",
          expanded && "opacity-100"
        )}
      />

      <div
        className={cn(
          "relative rounded-2xl border bg-card/80 backdrop-blur-sm transition-all duration-300",
          expanded ? "border-primary/20 shadow-lg shadow-primary/5" : "border-dashed hover:border-primary/30 hover:bg-muted/30"
        )}
      >
        {/* 触发按钮 */}
        <button
          type="button"
          onClick={toggle}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors"
        >
          <div
            className={cn(
              "flex size-8 items-center justify-center rounded-xl transition-all duration-300",
              expanded
                ? "bg-primary text-primary-foreground rotate-[135deg] shadow-md shadow-primary/20"
                : "bg-primary/10 text-primary"
            )}
          >
            <Plus className="size-4" strokeWidth={2.5} />
          </div>
          <span className={cn("flex-1 text-sm font-medium transition-colors", expanded ? "text-foreground" : "text-muted-foreground")}>
            {expanded ? "新建作业" : "快速添加作业"}
          </span>
          {expanded && <Sparkles className="size-3.5 text-primary/40 animate-pulse-subtle" />}
          <ChevronDown
            className={cn(
              "size-4 text-muted-foreground transition-transform duration-300",
              expanded && "rotate-180"
            )}
          />
        </button>

        {/* 表单 — 直接条件渲染 */}
        {expanded && (
          <div
            role="presentation"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            className="animate-fade-up"
          >
            <form onSubmit={handleSubmit} className="space-y-4 px-4 pb-4">
              <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

              <div className="space-y-1.5">
                <label htmlFor="assignment-title" className="block text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  作业标题
                </label>
                <Input
                  ref={inputRef}
                  id="assignment-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="输入作业名称..."
                  className="h-11 bg-muted/40 border-transparent focus:border-primary/30 focus:bg-background transition-all"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                />
              </div>

              <div className="space-y-1.5">
                <span className="block text-xs font-medium text-muted-foreground uppercase tracking-wider">科目</span>
                <SubjectSelector
                  subjects={subjects}
                  value={subject}
                  onChange={setSubject}
                  className="max-h-32 overflow-y-auto"
                />
              </div>

              <div className="space-y-1.5">
                <span className="block text-xs font-medium text-muted-foreground uppercase tracking-wider">截止日期和时间</span>
                <div className="grid grid-cols-2 gap-3">
                  <DatePicker value={deadline} onChange={setDeadline} placeholder="选择截止日期" />
                  <TimePicker value={time} onChange={setTime} placeholder="选择时间" />
                </div>
              </div>

              <Button
                type="submit"
                disabled={!canSubmit || submitting}
                className="relative h-11 w-full overflow-hidden bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md shadow-primary/15 transition-all duration-200 hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98]"
              >
                {submitting ? (
                  <div className="size-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
                ) : (
                  <>
                    <Plus className="size-4" />
                    添加作业
                  </>
                )}
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
