/**
 * NJTECH 教务系统 — 登录 + 课表/考试/成绩抓取
 * 搬自 timetable/scripts/fetch_jwgl.js，改为 TypeScript 函数化
 */

import type { CourseData, ExamData } from "../types";

import { encryptJwglPassword } from "./jwgl-crypto";
import { createClient, createClientWithCookie } from "./jwgl-http";

const BASE = "https://jwgl.njtech.edu.cn";

// ── NJTECH 节次时间表 ──────────────────────────────────────────
// 南京工业大学标准作息时间（每节课45分钟，课间休息10分钟）
export const NJTECH_PERIOD_TIMES: Record<string, string> = {
  "1": "08:10-08:55",
  "2": "09:05-09:50",
  "3": "10:20-11:05",
  "4": "11:15-12:00",
  "5": "14:00-14:45",
  "6": "14:55-15:40",
  "7": "16:00-16:45",
  "8": "16:55-17:40",
  "9": "19:00-19:45",
  "10": "19:55-20:40",
};

// ── 登录 ────────────────────────────────────────────────────

export interface JwglSession {
  cookie: string;
  username: string;
}

export { createClientWithCookie } from "./jwgl-http";

/**
 * 登录教务系统，返回 session（含 cookie）
 */
export async function loginJwgl(
  username: string,
  password: string
): Promise<JwglSession> {
  const client = createClient(BASE);

  // Step 1: 获取登录页面 → 提取 CSRF token
  const pg = await client.req("/xtgl/login_slogin.html");
  const csrfMatch = pg.body.match(
    /id="csrftoken"[^>]*value="([^"]+)"/
  );
  const csrf = csrfMatch ? csrfMatch[1].split(",")[0] : "";
  if (!csrf) throw new Error("无法提取 CSRF token");

  // Step 2: 获取 RSA 公钥
  const keyResp = await client.req(
    "/xtgl/login_getPublicKey.html?time=" + Date.now()
  );
  const keyData = JSON.parse(keyResp.body);
  const { modulus, exponent } = keyData;

  // Step 3: RSA 加密密码
  const ep = encryptJwglPassword(password, modulus, exponent);

  // Step 4: 登录
  const loginResp = await client.req("/xtgl/login_slogin.html", {
    method: "POST",
    body: `csrftoken=${encodeURIComponent(csrf)}&yhm=${username}&mm=${encodeURIComponent(ep)}&language=zh_CN`,
  });

  // 正方教务系统登录失败时仍返回 200，但响应体包含错误信息
  // 成功登录会重定向到主页，或返回包含用户信息的页面
  const body = loginResp.body || "";

  // 检查是否登录失败 — 正方系统失败时页面仍包含登录表单或错误提示
  if (body.includes("用户名或密码不正确") || body.includes("密码错误") || body.includes("验证码错误")) {
    throw new Error("学号或密码不正确");
  }

  // 如果响应体仍然包含登录表单的 CSRF token，说明没有成功跳转
  if (body.includes("csrftoken") && body.length > 500) {
    throw new Error("登录失败，请检查学号和密码");
  }

  // 检查 cookie 是否包含 JSESSIONID — 登录成功的标志
  const cookie = client.getCookie();
  if (!cookie || !cookie.includes("JSESSIONID")) {
    throw new Error("登录失败：未获取到有效会话");
  }

  return {
    cookie,
    username,
  };
}

// ── 课表抓取 ────────────────────────────────────────────────

/** 学期显示名（如 2026-2027学年第一学期） */
export function termLabel(year: number, semester: number): string {
  return `${year}-${year + 1}学年${semester === 3 ? "第一" : "第二"}学期`;
}

/**
 * 候选学期列表（新到旧），交界月（7-8 月）优先探测即将开始的秋学期。
 * 正方不提供当前学期查询接口（无参数请求返回 0 条），按日历日期推断
 * 在学期交界期（如 8 月下旬新学期课表已生成）必然出错，改为探测制。
 * xnm = 学年起始年份；第一学期(秋季) xqm=3，第二学期(春季) xqm=12
 */
export function candidateXnxqList(): Array<{ year: number; semester: number }> {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  if (m >= 9) {
    // 秋学期进行中
    return [
      { year: y, semester: 3 },
      { year: y - 1, semester: 12 },
    ];
  }
  if (m >= 7) {
    // 暑假：新学期课表通常已生成，先探秋学期
    return [
      { year: y, semester: 3 },
      { year: y - 1, semester: 12 },
      { year: y - 1, semester: 3 },
    ];
  }
  // 1-6 月：春学期（学年始于上一年）
  return [
    { year: y - 1, semester: 12 },
    { year: y - 1, semester: 3 },
  ];
}

export async function fetchSchedule(
  cookie: string,
  xnm?: number,
  xqm?: number
): Promise<CourseData[]> {
  const client = createClientWithCookie(BASE, cookie);

  // 显式指定学期 -> 单查；否则按候选列表探测，返回第一个有数据的学期
  const candidates =
    xnm && xqm ? [{ year: xnm, semester: xqm }] : candidateXnxqList();

  for (const { year, semester } of candidates) {
    const resp = await client.req("/kbcx/xskbcx_cxXsKb.html?gnmkdm=N253508", {
      method: "POST",
      body: `xnm=${year}&xqm=${semester}`,
    });

    if (!resp.body || resp.body.length < 10) {
      continue;
    }

    try {
      const data = JSON.parse(resp.body);
      const kbList = data?.kbList || [];

      if (kbList.length > 0) {
        return kbList.map((item: Record<string, unknown>) => ({
          title: (item.kcmc as string) || "",
          weekday: parseInt(item.xqj as string) || 0,
          periods: parsePeriods(item.jc as string),
          weeks: cleanWeekSpec((item.zcd as string) || ""),
          location: (item.cdmc as string) || (item.xqmc as string) || "",
          teacher: (item.xm as string) || "",
          ...item,
        }));
      }

      // JWGL 返回空课表（学期末常见）→ 从考试数据反向生成课表
      const examCourses = await buildScheduleFromExams(cookie, year, semester);
      if (examCourses.length > 0) return examCourses;
    } catch {
      continue;
    }
  }
  return [];
}

/**
 * 从考试数据的 sksj（上课时间）字段反向生成课表
 * sksj 格式: "星期一第5-6节{2-17周};星期四第5-6节{2-17周}"
 */
async function buildScheduleFromExams(
  cookie: string,
  year: number,
  semester: number
): Promise<CourseData[]> {
  const exams = await fetchExams(cookie, year, semester);
  if (!exams.length) return [];

  const courses: CourseData[] = [];
  const seen = new Set<string>();

  for (const exam of exams) {
    const title = exam.subject || (exam as Record<string, unknown>).kcmc as string || "";
    if (!title || seen.has(title)) continue;
    seen.add(title);

    const sksj = ((exam as Record<string, unknown>).sksj as string) || "";
    if (!sksj) continue;

    // 解析 sksj: "星期一第5-6节{2-17周};星期四第5-6节{2-17周}"
    const segments = sksj.split(";").filter(Boolean);

    for (const seg of segments) {
      const weekdayMatch = seg.match(/星期([一二三四五六日天])/);
      const periodMatch = seg.match(/第(\d+)-?(\d+)?节/);
      const weeksMatch = seg.match(/\{(\d+)-(\d+)周\}/);

      if (!weekdayMatch) continue;

      const weekdayMap: Record<string, number> = {
        "一": 1, "二": 2, "三": 3, "四": 4,
        "五": 5, "六": 6, "日": 7, "天": 7,
      };
      const weekday = weekdayMap[weekdayMatch[1]] || 0;

      const startPeriod = periodMatch ? parseInt(periodMatch[1]) : 0;
      const endPeriod = periodMatch?.[2] ? parseInt(periodMatch[2]) : startPeriod;
      const periods: number[] = [];
      for (let i = startPeriod; i <= endPeriod; i++) periods.push(i);

      const weeks = weeksMatch ? `${weeksMatch[1]}-${weeksMatch[2]}` : "";

      const teacher = ((exam as Record<string, unknown>).jsxx as string) || "";
      const teacherName = teacher.split("/").pop() || teacher;

      const location = ((exam as Record<string, unknown>).cdmc as string) || "";

      courses.push({
        title,
        weekday,
        periods,
        weeks,
        location,
        teacher: teacherName,
      });
    }
  }

  return courses;
}

/**
 * 清理周次规格字符串 — 去掉"周"字后缀
 * JWGL 返回 "2-13周" 或 "2-13,偶数周"，需要转为 "2-13" 或 "2-13,偶数"
 */
function cleanWeekSpec(spec: string): string {
  return spec.replace(/周/g, "").trim();
}

function parsePeriods(jc: string): number[] {
  // jc 格式: "1-2节" 或 "3-4节" 或 "5节"
  const match = jc.match(/(\d+)-(\d+)/);
  if (match) {
    const start = parseInt(match[1]);
    const end = parseInt(match[2]);
    const periods: number[] = [];
    for (let i = start; i <= end; i++) periods.push(i);
    return periods;
  }
  const single = parseInt(jc);
  if (single > 0) return [single];
  return [];
}

// ── 考试抓取 ────────────────────────────────────────────────

export async function fetchExams(
  cookie: string,
  xnm?: number,
  xqm?: number
): Promise<ExamData[]> {
  const client = createClientWithCookie(BASE, cookie);

  // 与课表同一套学期策略：显式指定则单查，否则候选探测
  const candidates =
    xnm && xqm ? [{ year: xnm, semester: xqm }] : candidateXnxqList();

  for (const { year, semester } of candidates) {
    const resp = await client.req(
      "/kwgl/kscx_cxXsksxxIndex.html?doType=query&gnmkdm=N358105",
      {
        method: "POST",
        body: `xnm=${year}&xqm=${semester}&_search=false&nd=${Date.now()}&queryModel.showCount=100&queryModel.currentPage=1`,
      }
    );

    try {
      const data = JSON.parse(resp.body);
      const items = data?.items || [];
      if (items.length > 0) {
        return items.map((item: Record<string, unknown>) => ({
          subject: (item.kcmc as string) || "",
          date: (item.ksrq as string) || "",
          time: (item.kssj as string) || "",
          location: (item.cdmc as string) || "",
          seatNumber: (item.zwh as string) || "",
          ...item,
        }));
      }
    } catch {
      continue;
    }
  }
  return [];
}


