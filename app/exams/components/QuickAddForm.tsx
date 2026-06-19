"use client";

import { ChevronDown, Plus } from "lucide-react";
import { useState, useCallback } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker, TimePicker } from "@/components/ui/datetime-picker";
import { SubjectSelector } from "@/components/ui/subject-selector";
import { cn } from "@/lib/utils";
import type { Exam } from "@/types/exam";

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

const DATE_SHORTCUTS = [
  { label: "今天", fn: () => formatDate(new Date()) },
  { label: "明天", fn: () => formatDate(addDays(new Date(), 1)) },
  { label: "后天", fn: () => formatDate(addDays(new Date(), 2)) },
  { label: "下周一", fn: () => {
    const d = new Date();
    const day = d.getDay();
    const diff = day === 0 ? 1 : 8 - day;
    return formatDate(addDays(d, diff));
  }},
];

const TIME_PRESETS = [
  { label: "8:00", time: "08:00" },
  { label: "14:00", time: "14:00" },
  { label: "15:00", time: "15:00" },
  { label: "19:00", time: "19:00" },
];

export function QuickAddForm({
  subjects,
  onAdd,
  disabled,
}: {
  subjects: string[];
  onAdd: (exam: Omit<Exam, "id" | "source" | "status">) => Promise<void>;
  disabled?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [subject, setSubject] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");

  const canSubmit = Boolean(subject.trim() && date);

  const reset = useCallback(() => {
    setSubject("");
    setDate("");
    setTime("");
    setLocation("");
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    await onAdd({
      subject: subject.trim(),
      date,
      time: time || undefined,
      location: location || undefined,
    });
    reset();
    setExpanded(false);
  };

  return (
    <Card className="border-dashed bg-transparent">
      <CardHeader>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full items-center justify-between"
        >
          <CardTitle className="text-base">添加考试</CardTitle>
          <ChevronDown
            className={cn(
              "size-4 text-muted-foreground transition-transform duration-200",
              expanded && "rotate-180"
            )}
          />
        </button>
      </CardHeader>
      {expanded && (
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <span className="mb-1.5 block text-sm font-medium text-foreground">
                科目
              </span>
              <SubjectSelector
                subjects={subjects}
                value={subject}
                onChange={setSubject}
                className="max-h-32 overflow-y-auto"
              />
            </div>

            <div>
              <span className="mb-1.5 block text-sm font-medium text-foreground">
                日期时间
              </span>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {DATE_SHORTCUTS.map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => setDate(s.fn())}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium transition-all border",
                      date === s.fn()
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-muted/60 text-muted-foreground border-transparent hover:bg-primary/10 hover:text-primary"
                    )}
                  >
                    {s.label}
                  </button>
                ))}
                <span className="w-px h-5 bg-border self-center mx-0.5" />
                {TIME_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => setTime(p.time)}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium transition-all border",
                      time === p.time
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-muted/60 text-muted-foreground border-transparent hover:bg-primary/10 hover:text-primary"
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <DatePicker
                  value={date}
                  onChange={setDate}
                  placeholder="选择日期"
                  disabled={disabled}
                />
                <TimePicker
                  value={time}
                  onChange={setTime}
                  placeholder="选择时间"
                  disabled={disabled}
                />
              </div>
            </div>

            <div>
              <label htmlFor="exam-location" className="mb-1.5 block text-sm font-medium text-foreground">
                考场
              </label>
              <input
                id="exam-location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="选填"
                disabled={disabled}
                className="flex h-10 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <Button
              type="submit"
              disabled={disabled || !canSubmit}
              className="h-10 w-full"
            >
              <Plus className="size-4" />
              添加考试
            </Button>
          </form>
        </CardContent>
      )}
    </Card>
  );
}
