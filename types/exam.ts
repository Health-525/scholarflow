/**
 * 考试数据类型
 *
 * status 状态机：
 *   upcoming  → completed   （用户手动标记完成，或日期到期后可手动标记）
 *   upcoming  → deleted     （教务导入的考试被隐藏，保留记录用于去重）
 *   completed → upcoming    （取消完成）
 *   任意状态  → 彻底删除    （仅限 source === "manual" 的考试）
 */
export interface Exam {
  id: string;
  subject: string;
  date: string;          // YYYY-MM-DD
  time?: string;         // HH:MM 或 HH:MM-HH:MM
  location?: string;
  notes?: string;
  source: "manual" | "jwgl";   // manual = 用户手动添加；jwgl = 教务系统导入
  status: "upcoming" | "completed" | "deleted";
  completedAt?: number;  // 手动标记完成的时间戳（ms）
}
