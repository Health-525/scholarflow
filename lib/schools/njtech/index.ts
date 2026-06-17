/**
 * NJTECH (南京工业大学) School Adapter
 *
 * 实现 SchoolAdapter 接口，提供教务系统登录和数据抓取能力。
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

import { fetchAllGrades } from "./grades";
import { fetchJwcNews } from "./jwc-news";
import { loginJwgl, fetchSchedule, fetchExams } from "./jwgl";
import { fetchLibrarySeats } from "./library";

export const njtechAdapter: SchoolAdapter = {
  id: "njtech",
  name: "南京工业大学",
  loginFields: [
    {
      key: "username",
      label: "学号",
      type: "text",
      placeholder: "如 202321144057",
      required: true,
    },
    {
      key: "password",
      label: "教务系统密码",
      type: "password",
      placeholder: "正方教务系统密码",
      required: true,
    },
  ],

  async login(credentials): Promise<SchoolCredentials> {
    const { username, password } = credentials;

    if (!username || !password) {
      throw new Error("请输入学号和密码");
    }

    // 登录教务系统验证凭证
    const session = await loginJwgl(username, password);

    return {
      schoolId: "njtech",
      data: {
        username,
        cookie: session.cookie,
        libraryJwt: credentials.libraryJwt || "",
      },
      expiresAt: Date.now() + 30 * 60 * 1000, // 30 分钟过期
    };
  },

  async fetchSchedule(credentials): Promise<CourseData[]> {
    return fetchSchedule(credentials.data.cookie);
  },

  async fetchExams(credentials): Promise<ExamData[]> {
    return fetchExams(credentials.data.cookie);
  },

  async fetchGrades(credentials): Promise<GradeResult> {
    return fetchAllGrades(
      credentials.data.cookie,
      credentials.data.username
    );
  },

  async fetchLibrary(credentials): Promise<LibraryData | null> {
    const jwt = credentials.data.libraryJwt;
    if (!jwt) return null;
    return fetchLibrarySeats(jwt);
  },

  async fetchJwcNews(): Promise<NewsItem[]> {
    return fetchJwcNews();
  },

  getCurrentSemester(): { year: string; semester: string; week1Monday: string } {
    const now = new Date();
    const month = now.getMonth() + 1; // 1-12
    // NJTECH: 第一学期 9-1月, 第二学期 2-6月, 暑假 7-8月
    const isSecondSemester = month >= 2 && month <= 6;
    const year = isSecondSemester
      ? String(now.getFullYear() - 1)  // 2025-2026学年第二学期 → year=2025
      : String(now.getFullYear());     // 2025-2026学年第一学期 → year=2025
    const semester = isSecondSemester ? "2" : "1";

    // NJTECH 2025-2026学年第二学期开学日期: 2026-03-02
    // TODO: 后续可从教务系统动态获取
    const week1MondayMap: Record<string, string> = {
      "2025-2": "2026-03-02",
      "2025-1": "2025-09-01",
    };
    const week1Monday = week1MondayMap[`${year}-${semester}`] || "2026-03-02";

    return { year, semester, week1Monday };
  },
};
