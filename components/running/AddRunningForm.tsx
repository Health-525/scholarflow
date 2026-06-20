"use client";

import { Footprints, Sunrise } from "lucide-react";
import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { isDuplicateRun } from "@/lib/running-utils";
import type { RunRecord, RunType } from "@/types";

interface AddRunningFormProps {
  records: RunRecord[];
  onAdd: (record: { date: string; type: RunType }) => Promise<RunRecord[]>;
  onCancel?: () => void;
}

const RUN_TYPE_OPTIONS = [
  { id: "morning", label: "🌅 晨跑", icon: Sunrise },
  { id: "free", label: "🏃 自由跑", icon: Footprints },
];

export function AddRunningForm({ records, onAdd, onCancel }: AddRunningFormProps) {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [type, setType] = useState<RunType>("morning");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDuplicate = isDuplicateRun(records, date, type);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!date) {
      setError("请选择日期");
      return;
    }

    if (isDuplicate) {
      setError(`该日期已有${type === "morning" ? "晨跑" : "自由跑"}记录`);
      return;
    }

    setIsSubmitting(true);
    try {
      await onAdd({ date, type });
      onCancel?.();
    } catch {
      setError("记录失败，请重试");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card hover={false} className="hover:translate-y-0 hover:shadow-sm">
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <h3 className="text-base font-semibold text-foreground">
            记录跑步
          </h3>

          <div className="space-y-1.5">
            <label htmlFor="run-date" className="text-sm font-medium text-muted-foreground">
              日期
            </label>
            <Input
              id="run-date"
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setError(null);
              }}
              required
              aria-required="true"
            />
          </div>

          <div className="space-y-1.5">
            <div className="text-sm font-medium text-muted-foreground">
              类型
            </div>
            <SegmentedControl
              options={RUN_TYPE_OPTIONS}
              value={type}
              onChange={(id) => {
                setType(id as RunType);
                setError(null);
              }}
            />
          </div>

          {isDuplicate && !error && (
            <p className="text-sm text-[var(--status-warning)]">
              ⚠️ 该日期已有{type === "morning" ? "晨跑" : "自由跑"}记录
            </p>
          )}

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={isSubmitting || isDuplicate}
              className="flex-1"
              aria-label={isSubmitting ? "记录中" : "记录跑步"}
            >
              {isSubmitting ? "记录中..." : "记录"}
            </Button>
            {onCancel && (
              <Button
                type="button"
                variant="secondary"
                onClick={onCancel}
                aria-label="取消"
              >
                取消
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default AddRunningForm;
