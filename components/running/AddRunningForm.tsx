"use client";

import { useState, FormEvent } from "react";
import type { RunRecord, RunType } from "@/types";
import { isDuplicateRun } from "@/lib/running-utils";

interface AddRunningFormProps {
  records: RunRecord[];
  onAdd: (record: { date: string; type: RunType }) => Promise<RunRecord[]>;
  onCancel?: () => void;
}

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
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl p-4 space-y-3"
      style={{
        backgroundColor: "var(--surface-elevated)",
        border: "1px solid var(--border)",
      }}
    >
      <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
        记录跑步
      </h3>

      <div>
        <label htmlFor="run-date" className="text-xs font-medium block mb-1" style={{ color: "var(--text-secondary)" }}>
          日期
        </label>
        <input
          id="run-date"
          type="date"
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            setError(null);
          }}
          className="w-full px-3 py-2 rounded-xl text-sm outline-none"
          style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
          required
          aria-required="true"
        />
      </div>

      <div>
        <div className="text-xs font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
          类型
        </div>
        <div className="flex gap-2">
          {(["morning", "free"] as RunType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => { setType(t); setError(null); }}
              className="flex-1 py-2 rounded-xl text-sm font-medium"
              style={{
                backgroundColor: type === t ? "var(--accent)" : "var(--border)",
                color: type === t ? "#fff" : "var(--text-secondary)",
              }}
              aria-pressed={type === t}
              aria-label={t === "morning" ? "晨跑" : "自由跑"}
            >
              {t === "morning" ? "🌅 晨跑" : "🏃 自由跑"}
            </button>
          ))}
        </div>
      </div>

      {isDuplicate && !error && (
        <p className="text-xs" style={{ color: "var(--status-warning)" }}>
          ⚠️ 该日期已有{type === "morning" ? "晨跑" : "自由跑"}记录
        </p>
      )}

      {error && (
        <p className="text-xs" style={{ color: "var(--status-error)" }} role="alert">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isSubmitting || isDuplicate}
          className="flex-1 py-2.5 rounded-xl text-sm font-medium"
          style={{
            backgroundColor: "var(--accent)",
            color: "#fff",
            opacity: isSubmitting || isDuplicate ? 0.5 : 1,
          }}
          aria-label={isSubmitting ? "记录中" : "记录跑步"}
        >
          {isSubmitting ? "记录中..." : "记录"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl text-sm font-medium"
            style={{ backgroundColor: "var(--border)", color: "var(--text-secondary)" }}
            aria-label="取消"
          >
            取消
          </button>
        )}
      </div>
    </form>
  );
}

export default AddRunningForm;
