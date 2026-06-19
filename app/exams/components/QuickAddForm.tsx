"use client";

import { CalendarDays, MapPin, Plus } from "lucide-react";
import { useState, useCallback } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SubjectSelector } from "@/components/ui/subject-selector";
import type { Exam } from "@/types/exam";

export function QuickAddForm({
  subjects,
  onAdd,
  disabled,
}: {
  subjects: string[];
  onAdd: (exam: Omit<Exam, "id" | "source" | "status">) => Promise<void>;
  disabled?: boolean;
}) {
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
  };

  return (
    <Card className="border-dashed bg-transparent">
      <CardHeader>
        <CardTitle className="text-base">添加考试</CardTitle>
      </CardHeader>
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="exam-date"
                className="mb-1.5 block text-sm font-medium text-foreground"
              >
                日期
              </label>
              <div className="relative">
                <Input
                  id="exam-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  disabled={disabled}
                  required
                  className="h-10 pl-9"
                />
                <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>
            <div>
              <label
                htmlFor="exam-time"
                className="mb-1.5 block text-sm font-medium text-foreground"
              >
                时间
              </label>
              <Input
                id="exam-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                disabled={disabled}
                className="h-10"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="exam-location"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              考场
            </label>
            <div className="relative">
              <Input
                id="exam-location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="选填"
                disabled={disabled}
                className="h-10 pl-9"
              />
              <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            </div>
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
    </Card>
  );
}
