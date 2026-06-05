"use client";

import { useState, FormEvent } from "react";
import type { AssignmentDraft, Assignment } from "@/types";

interface AddAssignmentFormProps {
  onAdd: (draft: AssignmentDraft) => Promise<Assignment[] | void>;
  onCancel?: () => void;
}

export function AddAssignmentForm({ onAdd, onCancel }: AddAssignmentFormProps) {
  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState("");
  const [deadline, setDeadline] = useState("");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!subject.trim()) {
      setError("请输入科目名称");
      return;
    }
    if (!title.trim()) {
      setError("请输入作业标题");
      return;
    }
    if (!deadline) {
      setError("请设置截止时间");
      return;
    }

    setIsSubmitting(true);
    try {
      await onAdd({
        subject: subject.trim(),
        title: title.trim(),
        deadline: new Date(deadline).toISOString(),
        note: note.trim() || undefined,
      });
      // Reset form
      setSubject("");
      setTitle("");
      setDeadline("");
      setNote("");
      onCancel?.();
    } catch {
      setError("提交失败，请重试");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-2xl p-4"
      style={{
        backgroundColor: "var(--surface-elevated)",
        border: "1px solid var(--border)",
      }}
    >
      <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
        新增作业
      </h3>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor="af-subject" className="text-xs font-medium block mb-1" style={{ color: "var(--text-secondary)" }}>
            科目 *
          </label>
          <input
            id="af-subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="如：数学"
            className="w-full px-3 py-2 rounded-xl text-sm outline-none"
            style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            required
            aria-required="true"
          />
        </div>
        <div>
          <label htmlFor="af-title" className="text-xs font-medium block mb-1" style={{ color: "var(--text-secondary)" }}>
            标题 *
          </label>
          <input
            id="af-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="作业标题"
            className="w-full px-3 py-2 rounded-xl text-sm outline-none"
            style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            required
            aria-required="true"
          />
        </div>
      </div>

      <div>
        <label htmlFor="af-deadline" className="text-xs font-medium block mb-1" style={{ color: "var(--text-secondary)" }}>
          截止时间 *
        </label>
        <input
          id="af-deadline"
          type="datetime-local"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          className="w-full px-3 py-2 rounded-xl text-sm outline-none"
          style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
          required
          aria-required="true"
        />
      </div>

      <div>
        <label htmlFor="af-note" className="text-xs font-medium block mb-1" style={{ color: "var(--text-secondary)" }}>
          备注（可选）
        </label>
        <textarea
          id="af-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="其他说明..."
          rows={2}
          className="w-full px-3 py-2 rounded-xl text-sm outline-none resize-none"
          style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
        />
      </div>

      {error && (
        <p className="text-xs" style={{ color: "var(--status-error)" }} role="alert">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 py-2.5 rounded-xl text-sm font-medium"
          style={{
            backgroundColor: "var(--accent)",
            color: "#fff",
            opacity: isSubmitting ? 0.6 : 1,
          }}
          aria-label={isSubmitting ? "提交中" : "添加作业"}
        >
          {isSubmitting ? "添加中..." : "添加"}
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

export default AddAssignmentForm;
