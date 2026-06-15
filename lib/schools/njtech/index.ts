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
import { loginJwgl, fetchSchedule, fetchExams, fetchCurrentGrades } from "./jwgl";
import { fetchAllGrades } from "./grades";
import { fetchLibrarySeats } from "./library";
import { fetchJwcNews } from "./jwc-news";

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
    {
      key: "libraryJwt",
      label: "图书馆 JWT（可选）",
      type: "password",
      placeholder: "从浏览器登录图书馆后提取",
      required: false,
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
};
