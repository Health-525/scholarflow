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
  NewsItem,
} from "../types";

import { fetchAllGrades } from "./grades";
import { fetchJwcNews } from "./jwc-news";
import { loginJwgl, fetchSchedule, fetchExams, NJTECH_PERIOD_TIMES } from "./jwgl";
export const njtechAdapter: SchoolAdapter = {
  id: "njtech",
  name: "南京工业大学",
  periodTimes: NJTECH_PERIOD_TIMES,
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
      : String(now.getFullYear());     // 2026-2027学年第一学期 → year=2026
    const semester = isSecondSemester ? "2" : "1";

    // 开学日期（第 1 周周一）：已知学期记录实际值，未知学期按
    // 「秋季 9 月 / 春季 3 月第一个周一」估算，校历发布后校准。
    // 2026-1（2026-09-07）与 2026 选课通知日期交叉吻合：
    // 9/2 公布停开、9/10-13 第 1 周补退选、9/21-24 第 3 周课程补退选。
    const week1MondayMap: Record<string, string> = {
      "2025-2": "2026-03-02",
      "2025-1": "2025-09-01",
      "2026-1": "2026-09-07",
    };
    const week1Monday = week1MondayMap[`${year}-${semester}`] || "2026-09-07";

    return { year, semester, week1Monday };
  },
};
