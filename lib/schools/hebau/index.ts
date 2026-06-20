/**
 * HBAU (河北农业大学) School Adapter
 * CAS 统一认证 + URP 教务系统
 */

import * as http from "http";
import * as https from "https";

import type { SchoolAdapter, SchoolCredentials, CourseData, ExamData, NewsItem } from "../types";

import { parseHebauExamResponse } from "./exams";
import { fetchAllGrades } from "./grades";
import { fetchJwcNews } from "./jwc-news";
import { loginHebauWithMfa } from "./mfa";
import { HEBAU_PERIOD_TIMES } from "./period-times";

const URP_URL = "http://urp.hebau.edu.cn:1009";

// ── HTTP ──────────────────────────────────────────────────────

function urpRequest(path: string, cookie: string, body?: string): Promise<{ statusCode: number; body: string }> {
  return new Promise((resolve, reject) => {
    const u = new URL(path, URP_URL);
    const t = u.protocol === "https:" ? https : http;
    const req = t.request(u, {
      method: body ? "POST" : "GET",
      headers: {
        Cookie: cookie, Accept: "application/json, text/javascript, */*; q=0.01",
        "X-Requested-With": "XMLHttpRequest", "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Referer: `${URP_URL}/jwapp/sys/homeapp/home/index.html`,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      rejectUnauthorized: false,
    }, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (c: Buffer) => chunks.push(c));
      res.on("end", () => resolve({ statusCode: res.statusCode || 0, body: Buffer.concat(chunks).toString("utf-8") }));
    });
    req.on("error", reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error("超时")); });
    if (body) req.write(body);
    req.end();
  });
}

// ── 学期 ──────────────────────────────────────────────────────

function getSemester(): { year: string; semester: string; week1Monday: string } {
  const m = new Date().getMonth() + 1;
  const y = new Date().getFullYear();
  const isSecond = m >= 2 && m <= 7;
  const year = isSecond ? String(y - 1) : String(y);
  const sem = isSecond ? "2" : "1";
  const map: Record<string, string> = { "2025-2": "2026-03-02", "2025-1": "2025-09-01", "2026-2": "2027-03-01", "2026-1": "2026-09-01" };
  return { year, semester: sem, week1Monday: map[`${year}-${sem}`] || "" };
}

// ── 课表 ──────────────────────────────────────────────────────

async function fetchSchedule(cookie: string): Promise<CourseData[]> {
  const sem = getSemester();
  const xnxqdm = `${sem.year}-${Number(sem.year) + 1}-${sem.semester}`;
  const resp = await urpRequest("/jwapp/sys/wdkb/modules/xskcb/cxxszhxqkb.do", cookie, `XNXQDM=${encodeURIComponent(xnxqdm)}&SKZC=16`);
  try {
    const d = JSON.parse(resp.body);
    const rows =
      d?.datas?.cxxszhxqkb?.rows ||
      d?.data?.rows ||
      d?.data ||
      d?.rows ||
      d ||
      [];
    if (Array.isArray(rows)) return rows.map((r: Record<string, unknown>) => ({
      title: (r.KCMC || r.kcmc || r.KCM || r.kcm || r.XSKCM || r.xskcm || "") as string,
      weekday: Number(r.XQJ || r.xqj || r.SKXQ || r.skxq || 0),
      periods: parsePeriods(
        String(r.SKJC || r.skjc || r.KSJC || r.ksjc || ""),
        String(
          r.SKCD ||
          r.skcd ||
          (Number(r.JSJC || r.jsjc || 0) && Number(r.KSJC || r.ksjc || 0)
            ? Number(r.JSJC || r.jsjc || 0) - Number(r.KSJC || r.ksjc || 0) + 1
            : "2")
        )
      ),
      weeks: (r.SKZC || r.skzc || r.ZCMC || r.zcmc || "") as string,
      location: (r.JASMC || r.jasmc || r.JSMC || r.jsmc || r.CDMC || r.cdmc || r.JXLDM_DISPLAY || "") as string,
      teacher: (r.SKJS || r.skjs || r.JSXM || r.jsxm || "") as string,
    }));
  } catch {}
  return [];
}

function parsePeriods(skjc: string, skcd: string): number[] {
  const s = Number(skjc) || 0;
  const l = Number(skcd) || 2;
  if (s <= 0) return [];
  return Array.from({ length: l }, (_, i) => s + i);
}

// ── 考试 ──────────────────────────────────────────────────────

async function fetchExams(cookie: string): Promise<ExamData[]> {
  const sem = getSemester();
  const xnxqdm = `${sem.year}-${Number(sem.year) + 1}-${sem.semester}`;
  const resp = await urpRequest("/jwapp/sys/wdkwapp/api/wdks/queryMyExamArrangeMent.do", cookie, `XNXQDM=${encodeURIComponent(xnxqdm)}`);
  try {
    return parseHebauExamResponse(JSON.parse(resp.body));
  } catch {}
  return [];
}

// ── 适配器 ────────────────────────────────────────────────────

export const hebauAdapter: SchoolAdapter = {
  id: "hebau",
  name: "河北农业大学",
  periodTimes: HEBAU_PERIOD_TIMES,
  loginFields: [
    { key: "username", label: "学号", type: "text", placeholder: "请输入学号", required: true },
    { key: "password", label: "CAS 密码", type: "password", placeholder: "统一认证密码", required: true },
  ],
  async login(credentials): Promise<SchoolCredentials> {
    const { username, password } = credentials;
    if (!username || !password) throw new Error("请输入学号和密码");
    const session = await loginHebauWithMfa(credentials);
    return {
      schoolId: "hebau",
      data: { username, cookie: session.cookie, sessionCookie: session.sessionCookie },
      expiresAt: Date.now() + 30 * 60 * 1000,
    };
  },
  async fetchSchedule(creds) { return fetchSchedule(creds.data.cookie); },
  async fetchExams(creds) { return fetchExams(creds.data.cookie); },
  async fetchGrades(creds) { return fetchAllGrades(creds.data.cookie, creds.data.username); },
  async fetchJwcNews(existingItems?: NewsItem[]): Promise<NewsItem[]> {
    return fetchJwcNews(existingItems);
  },
  getCurrentSemester: getSemester,
};
