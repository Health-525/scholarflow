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
  totalCredits: number;
  courseCount: number;
}
