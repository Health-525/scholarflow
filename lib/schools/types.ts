/**
 * SchoolAdapter — 学校适配器接口定义
 *
 * 每个学校实现此接口，提供登录验证和数据抓取能力。
 * 新增学校只需创建一个 adapter 文件并注册，不改核心逻辑。
 */

export interface SchoolAdapter {
  /** 学校唯一标识 (e.g. "njtech") */
  id: string;
  /** 学校显示名称 (e.g. "南京工业大学") */
  name: string;
  /** 登录页需要的输入字段 */
  loginFields: LoginField[];
  /** 登录验证 — 返回凭证对象（后续 fetch 方法使用） */
  login(credentials: Record<string, string>): Promise<SchoolCredentials>;
  /** 抓取课表 */
  fetchSchedule(credentials: SchoolCredentials): Promise<CourseData[]>;
  /** 抓取考试安排 */
  fetchExams(credentials: SchoolCredentials): Promise<ExamData[]>;
  /** 抓取成绩 + GPA */
  fetchGrades(credentials: SchoolCredentials): Promise<GradeResult>;
  /** 抓取图书馆座位（可选） */
  fetchLibrary?(credentials: SchoolCredentials): Promise<LibraryData | null>;
  /** 抓取教务通知（可选） */
  fetchJwcNews?(existingItems?: NewsItem[]): Promise<NewsItem[]>;
  /** 获取当前学期信息（可选） */
  getCurrentSemester?(): { year: string; semester: string; week1Monday: string };
}

// ── Login ───────────────────────────────────────────────────

export interface LoginField {
  key: string;          // e.g. "username", "password"
  label: string;        // e.g. "学号", "教务系统密码"
  type: "text" | "password";
  placeholder?: string;
  required: boolean;
}

// ── Credentials ─────────────────────────────────────────────

export interface SchoolCredentials {
  schoolId: string;
  /** 适配器自定义的凭证数据（加密存储在服务端 SQLite） */
  data: Record<string, string>;
  /** 凭证过期时间（可选，毫秒时间戳） */
  expiresAt?: number;
}

// ── Data Types ──────────────────────────────────────────────

export interface CourseData {
  title: string;
  weekday: number;
  periods: number[];
  weeks: string;
  location: string;
  teacher: string;
  [key: string]: unknown;
}

export interface ExamData {
  subject: string;
  date: string;
  time: string;
  location: string;
  seatNumber?: string;
  [key: string]: unknown;
}

export interface GradeResult {
  gpa: string;
  totalCredits: number;
  requiredCourses: number;
  allCourses: GradeCourse[];
}

export interface GradeCourse {
  course: string;
  score: string;
  credit: string;
  type: string;
  semester: string;
}

import type { LibraryData, LibraryRoom } from "@/types";
export type { LibraryData, LibraryRoom };

export interface NewsItem {
  title: string;
  url: string;
  date: string;
  category?: string;
}
