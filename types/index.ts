// ============================================================
// ScholarFlow 全局类型定义
// ============================================================

// ---- 主题 ----
export type ThemeValue = "light" | "dark" | "system";

// ---- GitHub 错误类型 ----
export type GitHubErrorType =
  | "network_timeout"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "rate_limit"
  | "conflict"
  | "server_error"
  | "unknown";

export interface GitHubError {
  type: GitHubErrorType;
  message: string;
  statusCode?: number;
}

// ---- GitHub API 类型 ----
export type GitHubRepo = "content" | "execution";

export interface FileContent {
  content: string; // Base64 已解码
  sha: string;
  path: string;
}

export interface DirectoryEntry {
  name: string;
  path: string;
  type: "file" | "dir";
}

// ---- 作业类型 ----
export type AssignmentUrgency = "overdue" | "urgent" | "reminder" | "normal";
// overdue:  deadline < now
// urgent:   0 < deadline - now ≤ 24h
// reminder: 24h < deadline - now ≤ 72h
// normal:   deadline - now > 72h

export interface Assignment {
  id: string; // UUID v4
  subject: string; // 科目名称
  title: string; // 作业标题
  deadline: string; // ISO 8601 时间戳（精确到分钟）
  note?: string; // 备注（可选）
  done: boolean;
  createdAt: string; // ISO 8601 时间戳
  completedAt?: string; // ISO 8601（完成时追加）
}

export interface AssignmentsFile {
  assignments: Assignment[];
}

export interface AssignmentDraft {
  subject: string;
  title: string;
  deadline: string; // ISO 8601
  note?: string;
}

// ---- 跑步类型 ----
export type RunType = "morning" | "free";

export interface RunRecord {
  date: string; // YYYY-MM-DD
  type: RunType;
  createdAt: string; // ISO 8601 时间戳
}

export interface RunningFile {
  records: RunRecord[];
}

export interface RunStats {
  total: number;
  morning: number;
  free: number;
  progressPercent: number; // Math.min(total / 50 * 100, 100)
}

export interface HeatmapDay {
  date: string; // YYYY-MM-DD
  hasMorning: boolean;
  hasFree: boolean;
}

// ---- 通知提醒类型 ----
export interface ReminderEntry {
  courseTitle: string;
  location?: string;
  startAt: number; // 开课时间戳（ms）
  remindAt: number; // 触发时刻（ms）
  minutes: 5 | 10 | 15;
  timerHandle?: number;
}

export interface ReminderStore {
  [courseKey: string]: ReminderEntry;
}

// ---- 图书馆座位类型 ----
export interface LibrarySeat {
  x: number;
  y: number;
  key: string;
  type: number;
  name: string;
  seat_status: number;
  status: boolean;
}

export interface LibraryLayout {
  seats_total: number;
  seats_used: number;
  seats_booking: number;
  max_x: number;
  max_y: number;
  seats: LibrarySeat[];
}

export interface LibraryRoom {
  lib_id: number;
  lib_name: string;
  lib_floor: string;
  is_open: boolean;
  lib_type: number;
  lib_group_id: number;
  lib_rt: {
    seats_total: number;
    seats_used: number;
    seats_booking: number;
    seats_has: number;
    reserve_ttl: number;
    open_time_str: string;
    close_time_str: string;
    advance_booking: string;
  };
  lib_layout?: LibraryLayout;
}

export interface LibraryData {
  updated: string;
  summary: {
    total: number;
    used: number;
    avail: number;
    rate: number;
  };
  libs: LibraryRoom[];
}

// ---- 知识画像类型 ----
export interface TechItem {
  name: string;
  stars: number; // 1~5
  category?: string;
}

export interface GapItem {
  name: string;
  description?: string;
}
