import { Monitor, Moon, Sun } from "lucide-react";

import type { ThemeValue } from "@/types";

export interface ConfirmState {
  title: string;
  description?: string;
  confirmText?: string;
  danger?: boolean;
  action: () => void;
}

export const THEME_OPTIONS: {
  value: ThemeValue;
  label: string;
  Icon: typeof Sun;
}[] = [
  { value: "light", label: "浅色", Icon: Sun },
  { value: "dark", label: "深色", Icon: Moon },
  { value: "system", label: "跟随系统", Icon: Monitor },
];

export interface StudentInfo {
  studentId: string;
  gpa: string;
  /** 计入 GPA 的必修课学分和（GPA 分母），不是已修总学分 */
  requiredCredits: number;
  courseCount: number;
}
