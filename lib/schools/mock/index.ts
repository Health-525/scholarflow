/**
 * Mock School Adapter
 *
 * 用于开发调试和单元测试，不需要真实学校账号即可跑通完整流程。
 *
 * 使用方法：
 *   1. 在 lib/schools/registry.ts 中 registerSchool(mockAdapter)
 *   2. 登录时选择 "Mock University"，任意学号 + 密码均可登录
 *   3. 所有数据返回真实结构的静态 fixture，便于 UI 开发和测试
 *
 * 注意：仅在开发/测试环境下注册此适配器，不要在生产构建中注册。
 */

import type {
  SchoolAdapter,
  SchoolCredentials,
  CourseData,
  ExamData,
  GradeResult,
  LibraryData,
  NewsItem,
} from "../types";

// ── Fixture 数据 ────────────────────────────────────────────

const MOCK_COURSES: CourseData[] = [
  {
    title: "软件工程",
    weekday: 1,
    periods: [1, 2],
    weeks: "1-16",
    location: "A101",
    teacher: "张老师",
  },
  {
    title: "计算机网络",
    weekday: 2,
    periods: [3, 4],
    weeks: "1-16",
    location: "B202",
    teacher: "李老师",
  },
  {
    title: "数据库原理",
    weekday: 3,
    periods: [5, 6],
    weeks: "1-8",
    location: "C303",
    teacher: "王老师",
  },
  {
    title: "操作系统",
    weekday: 4,
    periods: [1, 2],
    weeks: "9-16",
    location: "D404",
    teacher: "刘老师",
  },
  {
    title: "编译原理",
    weekday: 5,
    periods: [7, 8],
    weeks: "1-16",
    location: "E505",
    teacher: "赵老师",
  },
];

const MOCK_EXAMS: ExamData[] = [
  {
    subject: "软件工程",
    date: "2026-06-20",
    time: "09:00-11:00",
    location: "考场 A101",
    seatNumber: "12",
  },
  {
    subject: "计算机网络",
    date: "2026-06-22",
    time: "14:00-16:00",
    location: "考场 B202",
    seatNumber: "7",
  },
  {
    subject: "数据库原理",
    date: "2026-06-25",
    time: "09:00-11:00",
    location: "考场 C303",
    seatNumber: "23",
  },
];

const MOCK_GRADES: GradeResult = {
  gpa: "3.75",
  totalCredits: 48,
  requiredCourses: 12,
  allCourses: [
    { course: "高等数学", score: "92", credit: "4", type: "必修", semester: "2024-2025-1" },
    { course: "线性代数", score: "88", credit: "3", type: "必修", semester: "2024-2025-1" },
    { course: "大学物理", score: "85", credit: "3", type: "必修", semester: "2024-2025-1" },
    { course: "程序设计基础", score: "95", credit: "4", type: "必修", semester: "2024-2025-1" },
    { course: "数据结构", score: "90", credit: "4", type: "必修", semester: "2024-2025-2" },
    { course: "算法分析", score: "87", credit: "3", type: "必修", semester: "2024-2025-2" },
    { course: "计算机组成原理", score: "82", credit: "4", type: "必修", semester: "2024-2025-2" },
    { course: "软件工程", score: "91", credit: "3", type: "必修", semester: "2025-2026-1" },
  ],
};

const MOCK_LIBRARY: LibraryData = {
  updated: new Date().toISOString(),
  summary: { total: 200, used: 120, avail: 80, rate: 0.6 },
  libs: [
    {
      lib_id: 1,
      lib_name: "一楼自习室",
      lib_floor: "1F",
      is_open: true,
      lib_rt: {
        seats_total: 80,
        seats_used: 50,
        seats_booking: 5,
        seats_has: 25,
        open_time_str: "08:00",
        close_time_str: "22:00",
      },
    },
    {
      lib_id: 2,
      lib_name: "二楼阅览室",
      lib_floor: "2F",
      is_open: true,
      lib_rt: {
        seats_total: 120,
        seats_used: 70,
        seats_booking: 8,
        seats_has: 42,
        open_time_str: "08:00",
        close_time_str: "21:30",
      },
    },
  ],
};

const MOCK_NEWS: NewsItem[] = [
  {
    title: "关于2025-2026学年第二学期期末考试安排的通知",
    url: "https://mock.edu.cn/news/1",
    date: "2026-06-01",
    category: "考试通知",
  },
  {
    title: "暑期图书馆开放时间调整通知",
    url: "https://mock.edu.cn/news/2",
    date: "2026-05-28",
    category: "图书馆",
  },
  {
    title: "2026届毕业生学籍材料办理指南",
    url: "https://mock.edu.cn/news/3",
    date: "2026-05-20",
    category: "学籍管理",
  },
];

// ── 适配器实现 ──────────────────────────────────────────────

export const mockAdapter: SchoolAdapter = {
  id: "mock",
  name: "Mock University（开发测试用）",

  loginFields: [
    {
      key: "username",
      label: "学号（任意值）",
      type: "text",
      placeholder: "如 test_user",
      required: true,
    },
    {
      key: "password",
      label: "密码（任意值）",
      type: "password",
      placeholder: "任意密码均可登录",
      required: true,
    },
  ],

  async login(credentials): Promise<SchoolCredentials> {
    const { username, password } = credentials;

    if (!username || !password) {
      throw new Error("请输入学号和密码");
    }

    // Mock 登录：任意凭证均接受，模拟 200ms 网络延迟
    await new Promise((resolve) => setTimeout(resolve, 200));

    return {
      schoolId: "mock",
      data: {
        username,
        cookie: `mock_session_${Date.now()}`,
      },
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 小时
    };
  },

  async fetchSchedule(_credentials): Promise<CourseData[]> {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return MOCK_COURSES;
  },

  async fetchExams(_credentials): Promise<ExamData[]> {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return MOCK_EXAMS;
  },

  async fetchGrades(_credentials): Promise<GradeResult> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    return MOCK_GRADES;
  },

  async fetchLibrary(_credentials): Promise<LibraryData | null> {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return MOCK_LIBRARY;
  },

  async fetchJwcNews(): Promise<NewsItem[]> {
    await new Promise((resolve) => setTimeout(resolve, 80));
    return MOCK_NEWS;
  },

  getCurrentSemester(): { year: string; semester: string; week1Monday: string } {
    const now = new Date();
    const month = now.getMonth() + 1;
    const isSecond = month >= 2 && month <= 6;
    return {
      year: isSecond ? String(now.getFullYear() - 1) : String(now.getFullYear()),
      semester: isSecond ? "2" : "1",
      week1Monday: isSecond ? "2026-03-02" : "2025-09-01",
    };
  },
};
