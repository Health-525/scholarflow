import type { showToast } from "@/components/ui/ToastContainer";
import type { deleteExam } from "@/lib/exams-api";
import type { Exam } from "@/types/exam";

const DELETE_DELAY_MS = 5000;

export interface ExamDeleteCoordinatorDeps {
  deleteExam: typeof deleteExam;
  showToast: typeof showToast;
  randomUUID: () => string;
  setTimeout: (fn: () => void, ms: number) => ReturnType<typeof setTimeout>;
  clearTimeout: (id: ReturnType<typeof setTimeout>) => void;
}

export class ExamDeleteCoordinator {
  private rollbackMap = new Map<string, Exam[]>();
  private pendingDeleteMap = new Map<string, { exam: Exam; timer: ReturnType<typeof setTimeout> }>();

  constructor(
    private exams: Exam[],
    private setExams: (updater: (prev: Exam[]) => Exam[]) => void,
    private schoolId: string | null,
    private userId: string | null,
    private deps: ExamDeleteCoordinatorDeps,
  ) {}

  async handleDelete(id: string): Promise<void> {
    const target = this.exams.find((e) => e.id === id);
    if (!target) return;

    if (target.source === "manual") {
      const opId = this.deps.randomUUID();

      let currentExams: Exam[] = [];
      this.setExams((prev) => {
        currentExams = prev;
        return prev.filter((e) => e.id !== id);
      });
      this.rollbackMap.set(opId, currentExams);

      if (this.pendingDeleteMap.size > 0) {
        const flushEntries = Array.from(this.pendingDeleteMap.entries());
        this.pendingDeleteMap.clear();
        for (const [, { exam, timer }] of flushEntries) {
          this.deps.clearTimeout(timer);
          await this.deps.deleteExam(exam.id, this.schoolId, this.userId).catch(() => {
            this.deps.showToast("error", `删除「${exam.subject}」失败，请稍后重试`);
          });
        }
      }

      const timer = this.deps.setTimeout(() => {
        this.deps.deleteExam(target.id, this.schoolId, this.userId).catch((err: unknown) => {
          this.deps.showToast(
            "error",
            err instanceof Error ? err.message : `删除「${target.subject}」失败，请稍后重试`,
          );
        });
        this.pendingDeleteMap.delete(opId);
        this.rollbackMap.delete(opId);
      }, DELETE_DELAY_MS);

      this.pendingDeleteMap.set(opId, { exam: target, timer });

      this.deps.showToast(
        "success",
        `已删除「${target.subject}」`,
        DELETE_DELAY_MS,
        {
          label: "撤销",
          onClick: () => {
            if (this.pendingDeleteMap.has(opId)) {
              const entry = this.pendingDeleteMap.get(opId)!;
              this.deps.clearTimeout(entry.timer);
              this.pendingDeleteMap.delete(opId);
              const rollback = this.rollbackMap.get(opId);
              if (rollback) {
                this.setExams(() => rollback);
              } else {
                this.setExams((prev) =>
                  [...prev, target].sort((a, b) => a.date.localeCompare(b.date)),
                );
              }
              this.rollbackMap.delete(opId);
            }
          },
        },
      );
      return;
    }

    let snapshot: Exam[] | null = null;
    this.setExams((prev) => {
      snapshot = prev;
      return prev.map((e) => (e.id === id ? { ...e, status: "deleted" as const } : e));
    });
    try {
      await this.deps.deleteExam(id, this.schoolId, this.userId);
    } catch (err) {
      if (snapshot) this.setExams(() => snapshot!);
      this.deps.showToast("error", err instanceof Error ? err.message : "删除考试失败");
    } finally {
      snapshot = null;
    }
  }

  dispose(): void {
    this.pendingDeleteMap.forEach(({ exam, timer }) => {
      this.deps.clearTimeout(timer);
      this.deps.deleteExam(exam.id, this.schoolId, this.userId).catch(() => {});
    });
    this.pendingDeleteMap.clear();
  }
}
