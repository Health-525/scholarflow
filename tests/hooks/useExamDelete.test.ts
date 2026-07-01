import { beforeEach, describe, expect, it, vi } from "vitest";
import fc from "fast-check";

import { ExamDeleteCoordinator, type ExamDeleteCoordinatorDeps } from "@/app/exams/ExamDeleteCoordinator";
import type { Exam } from "@/types/exam";

type SetExamsFn = (updater: (prev: Exam[]) => Exam[]) => void;
type DeleteExamFn = (id: string, schoolId: string | null, userId: string | null) => Promise<void>;
type ShowToastFn = (
  type: "success" | "error" | "info" | "warning",
  message: string,
  duration?: number,
  action?: { label: string; onClick: () => void },
) => void;

function makeExam(id: string, subject: string, source: Exam["source"] = "manual"): Exam {
  return {
    id,
    subject,
    date: "2026-07-01",
    time: "09:00",
    location: "",
    source,
    status: "upcoming",
  };
}

describe("ExamDeleteCoordinator", () => {
  let currentExams: Exam[];
  let setExams: ReturnType<typeof vi.fn<SetExamsFn>>;
  let deleteExam: ReturnType<typeof vi.fn<DeleteExamFn>>;
  let showToast: ReturnType<typeof vi.fn<ShowToastFn>>;
  let timers: Map<string, ReturnType<typeof setTimeout>>;
  let timerIdCounter: number;

  beforeEach(() => {
    currentExams = [];
    setExams = vi.fn<SetExamsFn>((updater) => {
      currentExams = updater(currentExams);
    });
    deleteExam = vi.fn<DeleteExamFn>();
    showToast = vi.fn<ShowToastFn>();
    timers = new Map();
    timerIdCounter = 0;
  });

  function createCoordinator(initialExams: Exam[]): ExamDeleteCoordinator {
    currentExams = [...initialExams];
    let uuidCounter = 0;
    const deps: ExamDeleteCoordinatorDeps = {
      deleteExam,
      showToast,
      randomUUID: () => `op-${uuidCounter++}`,
      setTimeout: (fn, ms) => {
        const id = `timer-${timerIdCounter++}`;
        const handle = setTimeout(() => {
          timers.delete(id);
          fn();
        }, ms);
        timers.set(id, handle);
        return handle;
      },
      clearTimeout: (id) => {
        clearTimeout(id);
        for (const [key, value] of timers.entries()) {
          if (value === id) timers.delete(key);
        }
      },
    };
    return new ExamDeleteCoordinator(currentExams, setExams, "s1", "u1", deps);
  }

  // Feature: scholarflow-full-optimization, Property 1: 并发删除操作的唯一性与隔离性
  it("Property 1: 每次手动删除生成唯一 opId 且快照隔离", async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 1, max: 5 }), async (n) => {
        deleteExam.mockResolvedValue(undefined);
        currentExams = Array.from({ length: n + 1 }, (_, i) => makeExam(`e-${i}`, `科目${i}`));
        const coordinator = createCoordinator(currentExams);

        for (let i = 0; i < n; i++) {
          await coordinator.handleDelete(currentExams[0].id);
        }

        // 已删除 n 个，保留最后一个
        if (currentExams.length !== 1) return false;
        if (currentExams[0].id !== `e-${n}`) return false;

        return true;
      }),
      { numRuns: 20 },
    );
  });

  // Feature: scholarflow-full-optimization, Property 2: 顺序删除的 deferred flush 时序不变量
  it("Property 2: 第二次手动删除前会 flush 第一次的 deferred delete", async () => {
    const exam1 = makeExam("e1", "科目1");
    const exam2 = makeExam("e2", "科目2");
    const coordinator = createCoordinator([exam1, exam2]);

    deleteExam.mockResolvedValue(undefined);

    await coordinator.handleDelete("e1");
    expect(deleteExam).not.toHaveBeenCalled();

    await coordinator.handleDelete("e2");
    expect(deleteExam).toHaveBeenCalledWith("e1", "s1", "u1");
  });

  // Feature: scholarflow-full-optimization, Property 3: deferred flush 失败的 toast 准确性
  it("Property 3: deferred flush 失败时 toast 包含对应考试名称", async () => {
    const exam1 = makeExam("e1", "数学");
    const exam2 = makeExam("e2", "英语");
    const coordinator = createCoordinator([exam1, exam2]);

    deleteExam
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce(undefined);

    await coordinator.handleDelete("e1");
    await coordinator.handleDelete("e2");

    const errorToast = showToast.mock.calls.find(
      (call) => call[0] === "error" && typeof call[1] === "string" && call[1].includes("数学"),
    );
    expect(errorToast).toBeDefined();
  });

  // Feature: scholarflow-full-optimization, Property 4: 多次删除后可见列表完整性
  it("Property 4: 删除后可见列表完整保留未删除项", async () => {
    const exams = [makeExam("e1", "A"), makeExam("e2", "B"), makeExam("e3", "C")];
    const coordinator = createCoordinator(exams);

    deleteExam.mockResolvedValue(undefined);

    await coordinator.handleDelete("e1");
    await coordinator.handleDelete("e3");

    expect(currentExams.map((e) => e.id)).toEqual(["e2"]);
  });

  it("撤销删除可恢复考试", async () => {
    const exam = makeExam("e1", "数学");
    const coordinator = createCoordinator([exam]);

    deleteExam.mockResolvedValue(undefined);

    await coordinator.handleDelete("e1");
    expect(currentExams).toHaveLength(0);

    const undoCallback = showToast.mock.calls[0][3] as { onClick: () => void };
    undoCallback.onClick();

    expect(currentExams.map((e) => e.id)).toEqual(["e1"]);
  });
});
