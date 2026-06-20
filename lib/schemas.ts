import { z } from "zod";

// ── Assignment ──
export const assignmentSchema = z.object({
  subject: z.string().min(1, "请输入课程名称"),
  title: z.string().min(1, "请输入作业内容"),
  deadline: z.string().min(1, "请选择截止日期"),
});

export type AssignmentInput = z.infer<typeof assignmentSchema>;

