/**
 * NJTECH (南京工业大学) School Adapter
 *
 * 实现 SchoolAdapter 接口，提供教务系统登录和数据抓取能力。
 */

import { currentTerm, resolveTerm } from "../term-dates";
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
import { loginJwgl, fetchSchedule, fetchExams, NJTECH_PERIOD_TIMES } from "./jwgl";
import { fetchLibrarySeats } from "./library";

/**
 * 各学期第 1 周周一（校历实测值）。未列入的学期由 resolveTerm 估算。
 *
 * 每条都应有校历依据，不要填估算值——填了就无法与真值区分。
 */
const NJTECH_WEEK1_MONDAYS: Readonly<Record<string, string>> = {
  "2025-1": "2025-09-01",
  "2025-2": "2026-03-02",
  // 南工教〔2026〕11 号：报到 8-29～8-30、注册 8-31；2026-2027 学年校历第 1 周
  // 为 8-31～9-06。此前此处写作 2026-09-07（估算值），会让整个秋冬学期周次偏后一周。
  "2026-1": "2026-08-31",
  // 2026-2027 学年校历：春夏学期注册 2027-02-27～02-28，第 1 周自 2027-03-01 起。
  "2026-2": "2027-03-01",
};

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
    // 南工大：秋冬学期 9 月～次年 1 月，春夏学期 2～6 月，暑假 7～8 月
    return resolveTerm(NJTECH_WEEK1_MONDAYS, currentTerm(new Date(), [2, 6]));
  },
};
