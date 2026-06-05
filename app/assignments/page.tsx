"use client";

import { useState } from "react";
import { useAssignmentsQuery } from "@/hooks/useQueries";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorFallback } from "@/components/ui/ErrorFallback";
import { AssignmentList } from "@/components/assignments/AssignmentList";
import { AddAssignmentForm } from "@/components/assignments/AddAssignmentForm";

export default function AssignmentsPage() {
  const { assignments, isLoading, error, add, markDone, undoBuffer, undo, reload } =
    useAssignmentsQuery();
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="max-w-5xl mx-auto py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
          作业
        </h1>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-xl text-sm font-medium"
          style={{ backgroundColor: "var(--accent)", color: "#fff" }}
          aria-label={showForm ? "收起表单" : "新增作业"}
        >
          {showForm ? "收起" : "+ 新增"}
        </button>
      </div>

      {showForm && (
        <div className="mb-4">
          <AddAssignmentForm onAdd={add} onCancel={() => setShowForm(false)} />
        </div>
      )}

      {isLoading && (
        <div className="py-12">
          <LoadingSpinner label="加载作业..." />
        </div>
      )}

      {error && !isLoading && (
        <ErrorFallback message={error.message} onRetry={reload} />
      )}

      {!isLoading && !error && (
        <AssignmentList
          assignments={assignments}
          onMarkDone={markDone}
          undoBuffer={undoBuffer}
          onUndo={undo}
        />
      )}
    </div>
  );
}
