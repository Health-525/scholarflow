/**
 * NJTECH 选课模块 - 课程搜索 / 余量查询 / 提交选课
 *
 * 复用 jwgl.ts 的登录与 HTTP 客户端基础设施。
 * 接口路径与字段名集中在下方常量区，选课轮次开放后可通过
 * `scripts/xk.ts inspect` dump 原始响应进行校准，只需调整常量。
 */

import { loginJwgl } from "./jwgl";
import { createClient, createClientWithCookie } from "./jwgl-http";
import type { HttpClient } from "./jwgl-http";

const BASE = "https://jwgl.njtech.edu.cn";

// ── 接口路径常量（选课开放后按 inspect 结果校准）────────────────
/**
 * 选课模块：NJTECH 实测为「自主选课（预选/补选）」zzxkyzb 族，
 * 非闯关选课 cky-xsxk 族。入口 URL 由浏览器确认：
 * /xsxk/zzxkyzb_cxZzxkYzbIndex.html?gnmkdm=N253512&layout=default
 */
/** 选课入口页（含选课轮次 ID） */
const XK_ENTRY = "/xsxk/zzxkyzb_cxZzxkYzbIndex.html?gnmkdm=N253512&layout=default";
/** 课程列表查询（kchID/kcm 等筛选条件 POST） */
const XK_COURSE_LIST = "/xsxk/zzxkyzb_cxJxbWithKchZzxk.html";
/** 提交选课（选课操作） */
const XK_ADD_COURSE = "/xsxk/zzxkyzb_xkBcZx.html";

// ── 类型 ──────────────────────────────────────────────────────

export interface XkCourse {
  /** 教学班 ID（提交选课的 key） */
  jxbId: string;
  courseCode: string;
  courseName: string;
  teacher: string;
  credit: string;
  /** 课堂容量 */
  capacity: number;
  /** 已选人数 */
  selected: number;
  /** 剩余名额 */
  remain: number;
  /** 原始数据（字段校准用） */
  raw: Record<string, unknown>;
}

export interface XkSession {
  client: HttpClient;
  cookie: string;
  /** 选课轮次 ID */
  xkklcId: string;
  username: string;
}

export interface XkTarget {
  /** 课程名关键词（模糊匹配，包含即命中） */
  courseName: string;
  /** 教师名（可选，模糊匹配） */
  teacher?: string;
}

export interface XkSubmitResult {
  ok: boolean;
  message: string;
}

// ── 纯解析函数（可单测）────────────────────────────────────────

/**
 * 数字字段多 key fallback：正方各校字段命名有差异
 * （如 jg0xxrs/jg0mxrs、yxjxrs/yxbrs、jxbrl/kxrs 等）
 */
function pickNumber(raw: Record<string, unknown>, keys: string[]): number {
  for (const k of keys) {
    const v = raw[k];
    if (v !== undefined && v !== null && v !== "") {
      const n = typeof v === "number" ? v : parseInt(String(v), 10);
      if (!isNaN(n)) return n;
    }
  }
  return 0;
}

function pickString(raw: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = raw[k];
    if (v !== undefined && v !== null && String(v).length > 0) {
      return String(v);
    }
  }
  return "";
}

/**
 * 解析课程列表 JSON。
 * 兼容三种结构（字段名均为多 key fallback，覆盖 cky/zzxk 两族命名）：
 * - { tmpList: [{ jxb: {...}, kkxx: {...} }] }（正方新版常见嵌套）
 * - { jxbrys: [{ ... }] }（zzxkyzb 族）
 * - { kbList / items: [{ 平铺字段 }] }
 */
export function parseCourseList(json: unknown): XkCourse[] {
  if (!json || typeof json !== "object") return [];
  const root = json as Record<string, unknown>;

  let list: unknown[] = [];
  for (const key of ["tmpList", "jxbrys", "kbList", "items"]) {
    const v = root[key];
    if (Array.isArray(v)) {
      list = v;
      break;
    }
  }
  if (list.length === 0) return [];

  return list.map((item) => {
    // 新版嵌套结构：jxb（教学班）/ kkxx（开课信息）
    const obj = (item && typeof item === "object" ? item : {}) as Record<
      string,
      unknown
    >;
    const jxb = (obj.jxb && typeof obj.jxb === "object" ? obj.jxb : {}) as Record<
      string,
      unknown
    >;
    const kkxx = (obj.kkxx && typeof obj.kkxx === "object"
      ? obj.kkxx
      : {}) as Record<string, unknown>;
    const merged: Record<string, unknown> = { ...kkxx, ...obj, ...jxb };

    const capacity = pickNumber(merged, [
      "jxb_rl",
      "rl",
      "jxbrl",
      "capacity",
    ]);
    const selected = pickNumber(merged, [
      "yxjxrs",
      "xkrs",
      "yxbrs",
      "selectedCount",
      "jxbrs",
    ]);
    const remain = pickNumber(merged, [
      "syrl",
      "jg0xxrs",
      "jg0mxrs",
      "kxrs",
      "remain",
    ]);

    return {
      jxbId: pickString(merged, [
        "jxb_id",
        "jxbid",
        "do_jxb_id",
        "do_jxbid",
      ]),
      courseCode: pickString(merged, ["kch_id", "kch", "courseCode"]),
      courseName: pickString(merged, ["kcmc", "kcm", "courseName"]),
      teacher: pickString(merged, ["jsxx", "jgxm", "teacher"]),
      credit: pickString(merged, ["xf", "credit"]),
      capacity,
      selected,
      // 部分学校不返回 remain 字段，用容量-已选兜底
      remain: remain > 0 ? remain : Math.max(0, capacity - selected),
      raw: obj,
    };
  });
}

/**
 * 从选课入口页 HTML 解析选课轮次 ID（xkklcId）
 * zzxkyzb 入口为 Vue SPA，轮次 ID 常见于：
 * - <input id="xkklcId" value="...">（老式 JSP 渲染）
 * - JS 变量 xkklcId = "..." / xkklc_id: "..."（新版）
 */
export function parseXkklcId(html: string): string | null {
  if (!html) return null;
  const input = html.match(/id="xkklcId"[^>]*value="([^"]+)"/);
  if (input) return input[1];
  const jsVar = html.match(/xkklc_?[iI]d\s*[:=]\s*["']([^"']+)["']/);
  if (jsVar) return jsVar[1];
  return null;
}

/**
 * 检测响应是否为会话失效（正方失效时常 302 回登录页或返回登录 HTML）
 */
export function isSessionExpired(body: string): boolean {
  if (!body) return false;
  return (
    body.includes("login_slogin") ||
    body.includes('id="csrftoken"') ||
    body.includes("用户登录")
  );
}

/**
 * 目标课程匹配：课程名包含关键词，且（若指定）教师名包含关键词
 */
export function matchTargets(course: XkCourse, targets: XkTarget[]): boolean {
  return targets.some((t) => {
    if (!t.courseName) return false;
    if (!course.courseName.includes(t.courseName)) return false;
    if (t.teacher && !course.teacher.includes(t.teacher)) return false;
    return true;
  });
}

// ── HTTP 函数 ─────────────────────────────────────────────────

/**
 * 登录并进入选课，返回选课会话（含轮次 ID）
 */
export async function openXkSession(
  username: string,
  password: string
): Promise<XkSession> {
  // 1. 登录教务系统
  const { cookie } = await loginJwgl(username, password);

  // 2. 进入选课入口页，解析轮次 ID
  const client = createClientWithCookie(BASE, cookie);
  const entry = await client.req(XK_ENTRY);
  const xkklcId = parseXkklcId(entry.body);

  return {
    client,
    cookie,
    xkklcId: xkklcId || "",
    username,
  };
}

/**
 * 查询课程列表
 * @param keyword - 课程名关键词（可选）
 */
export async function searchCourses(
  session: XkSession,
  keyword?: string
): Promise<XkCourse[]> {
  // zzxkyzb 模块查询参数（下划线命名族）：
  // filt_link_mode(筛选范围)、fltKchZzxk/fltKcmc 筛选、rlkb 分页
  const form: Record<string, string> = {
    xkklc_id: session.xkklcId,
    filt_link_mode: "",
    filt_agnwd: "",
    filt_kch: "",
    filt_kcmc: keyword || "",
    filt_skls: "",
    filt_skxq: "",
    filt_skjc: "",
    "rlkb.pagination.itemCount": "100",
    "rlkb.pagination.pageNo": "1",
    _: String(Date.now()),
  };

  const resp = await session.client.req(XK_COURSE_LIST, {
    method: "POST",
    body: Object.entries(form)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join("&"),
  });

  if (isSessionExpired(resp.body)) {
    throw new Error("SESSION_EXPIRED");
  }

  try {
    return parseCourseList(JSON.parse(resp.body));
  } catch {
    return [];
  }
}

/**
 * 提交选课（选一门教学班）
 * zzxkyzb 族提交参数：jxb_id（教学班）、kch_id（课程）、rwlx（任务类型，1=主修）
 */
export async function submitCourse(
  session: XkSession,
  course: XkCourse
): Promise<XkSubmitResult> {
  const form: Record<string, string> = {
    xkklc_id: session.xkklcId,
    jxb_id: course.jxbId,
    kch_id: course.courseCode,
    rlkz: "",
    rlz: "",
    rwhd: "1",
    ckbj: "1",
    trnj: "",
    jxbzb: "",
    sjsh: "1",
    btn: "",
  };

  const resp = await session.client.req(XK_ADD_COURSE, {
    method: "POST",
    body: Object.entries(form)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join("&"),
  });

  if (isSessionExpired(resp.body)) {
    return { ok: false, message: "SESSION_EXPIRED" };
  }

  try {
    const data = JSON.parse(resp.body);
    const flag = data?.flag ?? data?.success;
    const msg =
      (data?.msg as string) || (data?.message as string) || "未知响应";
    if (flag === "1" || flag === 1 || flag === true) {
      return { ok: true, message: msg };
    }
    return { ok: false, message: msg };
  } catch {
    return {
      ok: false,
      message: `响应解析失败（HTTP ${resp.status}），请用 inspect 校准接口`,
    };
  }
}

/**
 * 供 inspect 使用的原始请求：返回入口页与查询接口的原始响应
 */
export async function inspectXk(
  username: string,
  password: string
): Promise<{
  entryHtml: string;
  xkklcId: string | null;
  courseListRaw: string;
}> {
  const { cookie } = await loginJwgl(username, password);
  const client = createClientWithCookie(BASE, cookie);
  const entry = await client.req(XK_ENTRY);
  const xkklcId = parseXkklcId(entry.body);

  const probe = await client.req(XK_COURSE_LIST, {
    method: "POST",
    body: `xkklc_id=${encodeURIComponent(xkklcId || "")}&filt_kcmc=&rlkb.pagination.itemCount=10&rlkb.pagination.pageNo=1&_=${Date.now()}`,
  });

  return {
    entryHtml: entry.body.slice(0, 50000),
    xkklcId,
    courseListRaw: probe.body.slice(0, 100000),
  };
}

// createClient 重新导出，便于外部（agent 工具）按需构建会话
export { createClient };
