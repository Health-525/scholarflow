"use client";

import { useState } from "react";
import type { Assignment } from "@/types";
import { AssignmentItem } from "./AssignmentItem";

type Tab = "todo" | "all";

interface AssignmentListProps {
  assignments: Assignment[];
  onMarkDone: (id: string) => void;
  undoBuffer: { assignment: Assignment; expiresAt: number } | null;
  onUndo: () => void;
}

export function AssignmentList({
  assignments,
  onMarkDone,
  undoBuffer,
  onUndo,
}: AssignmentListProps) {
  const [activeTab, setActiveTab] = useState<Tab>("todo");

  const todoList = assignments.filter((a) => !a.done);
  const displayList = activeTab === "todo" ? todoList : assignments;

  return (
    <div className="space-y-3">
      {/* Tabs */}
      <div
        className="flex rounded-xl overflow-hidden p-1"
        style={{ backgroundColor: "var(--surface-elevated)", border: "1px solid var(--border)" }}
        role="tablist"
        aria-label="作业列表切换"
      >
        {(["todo", "all"] as Tab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            onClick={() => setActiveTab(tab)}
            className="flex-1 py-2 text-sm font-medium rounded-lg"
            style={{
              backgroundColor: activeTab === tab ? "var(--accent)" : "transparent",
              color: activeTab === tab ? "#fff" : "var(--text-secondary)",
            }}
            aria-label={tab === "todo" ? "待办" : "全部"}
          >
            {tab === "todo" ? `待办 (${todoList.length})` : `全部 (${assignments.length})`}
          </button>
        ))}
      </div>

      {/* Undo toast */}
      {undoBuffer && undoBuffer.expiresAt > Date.now() && (
        <div
          className="flex items-center justify-between px-4 py-3 rounded-xl"
          style={{
            backgroundColor: "rgba(37,99,235,0.1)",
            border: "1px solid rgba(37,99,235,0.2)",
          }}
          role="status"
        >
          <span className="text-sm" style={{ color: "var(--text-primary)" }}>
            已完成：{undoBuffer.assignment.title}
          </span>
          <button
            type="button"
            onClick={onUndo}
            className="text-sm font-medium"
            style={{ color: "var(--accent)" }}
            aria-label="撤销完成"
          >
            撤销
          </button>
        </div>
      )}

      {/* List */}
      {displayList.length === 0 ? (
        <div
          className="rounded-2xl p-8 text-center"
          style={{ backgroundColor: "var(--surface-elevated)", border: "1px solid var(--border)" }}
        >
          <div className="text-3xl mb-2" aria-hidden="true">
            {activeTab === "todo" ? "🎉" : "📭"}
          </div>
          <p style={{ color: "var(--text-tertiary)" }}>
            {activeTab === "todo" ? "暂无待办作业" : "暂无作业记录"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayList.map((a) => (
            <AssignmentItem key={a.id} assignment={a} onMarkDone={onMarkDone} />
          ))}
        </div>
      )}
    </div>
  );
}

export default AssignmentList;
