"use client";

import { useEffect, useRef } from "react";

import { showToast } from "@/components/ui/ToastContainer";
import { deleteExam } from "@/lib/exams-api";
import type { Exam } from "@/types/exam";

import { ExamDeleteCoordinator } from "./ExamDeleteCoordinator";

export interface UseExamDeleteResult {
  handleDelete: (id: string) => Promise<void>;
}

export function useExamDelete(
  exams: Exam[],
  setExams: (updater: (prev: Exam[]) => Exam[]) => void,
  schoolId: string | null,
  userId: string | null,
): UseExamDeleteResult {
  const coordinatorRef = useRef<ExamDeleteCoordinator | null>(null);
  const examsRef = useRef(exams);
  examsRef.current = exams;

  if (!coordinatorRef.current) {
    coordinatorRef.current = new ExamDeleteCoordinator(
      examsRef.current,
      setExams,
      schoolId,
      userId,
      {
        deleteExam,
        showToast,
        randomUUID: () => crypto.randomUUID(),
        setTimeout: (fn, ms) => setTimeout(fn, ms),
        clearTimeout: (id) => clearTimeout(id),
      },
    );
  }

  // 卸载时落盘待删除缓冲
  useEffect(() => {
    return () => {
      coordinatorRef.current?.dispose();
    };
  }, [schoolId, userId]);

  return { handleDelete: (id: string) => coordinatorRef.current!.handleDelete(id) };
}
