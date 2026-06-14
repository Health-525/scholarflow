import { z } from "zod";

// ── GitHub PAT ──
export const setupTokenSchema = z.object({
  token: z
    .string()
    .min(1, "请输入 Token")
    .min(10, "Token 长度不能少于 10 位")
    .refine(
      (v) => v.startsWith("ghp_") || v.startsWith("github_pat_"),
      "Token 格式无效，请输入以 ghp_ 或 github_pat_ 开头的 Token"
    ),
});

export type SetupTokenInput = z.infer<typeof setupTokenSchema>;

// ── Assignment ──
export const assignmentSchema = z.object({
  subject: z.string().min(1, "请输入课程名称"),
  title: z.string().min(1, "请输入作业内容"),
  deadline: z.string().min(1, "请选择截止日期"),
});

export type AssignmentInput = z.infer<typeof assignmentSchema>;

// ── Daily Goal ──
export const goalSchema = z.object({
  title: z.string().min(1, "请输入目标内容").max(100, "目标内容不能超过 100 字"),
});

export type GoalInput = z.infer<typeof goalSchema>;

// ── Exam ──
export const examSchema = z.object({
  subject: z.string().min(1, "请输入科目"),
  date: z.string().min(1, "请选择考试日期"),
  time: z.string().min(1, "请选择考试时间"),
  location: z.string().min(1, "请输入考试地点"),
});

export type ExamInput = z.infer<typeof examSchema>;

// ── Wrinkle calibration ──
export const wrinkleCalibrationSchema = z.object({
  sensitivity: z.enum(["low", "medium", "high"]),
  cooldown: z.coerce.number().int().min(5).max(300),
});

export type WrinkleCalibrationInput = z.infer<typeof wrinkleCalibrationSchema>;
