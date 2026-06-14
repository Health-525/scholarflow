import type { Assignment, AssignmentUrgency, AssignmentDraft } from "@/types";

/**
 * 根据截止时间和当前时间，分类作业紧急度
 */
export function classifyUrgency(deadline: string, now: Date): AssignmentUrgency {
  const deadlineMs = new Date(deadline).getTime();
  const nowMs = now.getTime();
  const diff = deadlineMs - nowMs;

  if (diff <= 0) return "overdue";
  if (diff <= 24 * 60 * 60 * 1000) return "urgent";
  if (diff <= 72 * 60 * 60 * 1000) return "reminder";
  return "normal";
}

/**
 * 格式化截止倒计时
 * @param ms 距离截止时间的毫秒数（正数 = 未截止，负数 = 已截止）
 */
export function formatDeadlineCountdown(ms: number): string {
  if (ms <= 0) {
    // 已逾期
    const overdueSec = Math.floor(Math.abs(ms) / 1000);
    const overdueHours = Math.floor(overdueSec / 3600);
    return `已逾期 ${overdueHours} 小时`;
  }

  const totalSec = Math.floor(ms / 1000);
  const totalMinutes = Math.floor(totalSec / 60);
  const totalHours = Math.floor(totalMinutes / 60);

  if (ms > 24 * 60 * 60 * 1000) {
    // 超过 24 小时，显示天+小时
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;
    return `还剩 ${days} 天 ${hours} 小时`;
  } else {
    // 24 小时以内，显示小时+分钟
    const hours = totalHours;
    const minutes = totalMinutes % 60;
    return `还剩 ${hours} 小时 ${minutes} 分钟`;
  }
}

/**
 * 排序作业：优先按自定义 order 降序，然后按截止时间升序，相同时间按创建时间升序
 */
export function sortAssignments(assignments: Assignment[]): Assignment[] {
  return [...assignments].sort((a, b) => {
    const orderDiff = (b.order ?? 0) - (a.order ?? 0);
    if (orderDiff !== 0) return orderDiff;
    const deadlineDiff =
      new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    if (deadlineDiff !== 0) return deadlineDiff;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

/**
 * 生成 UUID v4
 */
export function generateAssignmentId(): string {
  return crypto.randomUUID();
}

/**
 * 从 Draft 构建完整 Assignment
 */
export function buildAssignment(draft: AssignmentDraft): Assignment {
  return {
    id: generateAssignmentId(),
    subject: draft.subject,
    title: draft.title,
    deadline: draft.deadline,
    note: draft.note,
    done: false,
    createdAt: new Date().toISOString(),
  };
}
