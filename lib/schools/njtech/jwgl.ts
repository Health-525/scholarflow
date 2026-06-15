/**
 * NJTECH 教务系统 — 登录 + 课表/考试/成绩抓取
 * 搬自 timetable/scripts/fetch_jwgl.js，改为 TypeScript 函数化
 */

import { createClient, type HttpClient, type HttpResponse } from "./jwgl-http";
import { encryptPassword } from "./jwgl-crypto";
import type { CourseData, ExamData, GradeCourse } from "../types";

const BASE = "https://jwgl.njtech.edu.cn";

// ── 登录 ────────────────────────────────────────────────────

export interface JwglSession {
  cookie: string;
  username: string;
}

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
  const ep = encryptPassword(password, modulus, exponent);

  // Step 4: 登录
  const loginResp = await client.req("/xtgl/login_slogin.html", {
    method: "POST",
    body: `csrftoken=${encodeURIComponent(csrf)}&yhm=${username}&mm=${encodeURIComponent(ep)}&language=zh_CN`,
  });

  if (loginResp.status !== 200 && loginResp.status !== 302) {
    throw new Error(`登录失败 (HTTP ${loginResp.status})`);
  }

  return {
    cookie: client.getCookie(),
    username,
  };
}

// ── 课表抓取 ────────────────────────────────────────────────

/**
 * 抓取课表数据
 * @param cookie - 登录后的 cookie
 * @param xnm - 学年 (e.g. 2025)
 * @param xqm - 学期 (3=秋季, 12=春季)
 */
export async function fetchSchedule(
  cookie: string,
  xnm?: number,
  xqm?: number
): Promise<CourseData[]> {
  const client = createClient(BASE);
  // Restore cookie
  const _client = createClientWithCookie(BASE, cookie);

  const now = new Date();
  const year = xnm ?? (now.getMonth() >= 9 ? now.getFullYear() : now.getFullYear() - 1);
  const semester = xqm ?? ((now.getMonth() >= 9 || now.getMonth() <= 1) ? 3 : 12);

  const resp = await _client.req("/kbcx/xskbcx_cxXsKb.html?gnmkdm=N253508", {
    method: "POST",
    body: `xnm=${year}&xqm=${semester}`,
  });

  if (resp.body.length < 100) return [];

  try {
    const data = JSON.parse(resp.body);
    const kbList = data?.kbList || [];
    return kbList.map((item: Record<string, unknown>) => ({
      title: (item.kcmc as string) || "",
      weekday: parseInt(item.xqj as string) || 0,
      periods: parsePeriods(item.cdmc as string),
      weeks: (item.zcd as string) || "",
      location: (item.xqmc as string) || (item.cdmc as string) || "",
      teacher: (item.xm as string) || "",
      ...item,
    }));
  } catch {
    return [];
  }
}

function parsePeriods(cdmc: string): number[] {
  // "1-2" → [1, 2], "3-4" → [3, 4]
  const match = cdmc.match(/(\d+)-(\d+)/);
  if (match) {
    const start = parseInt(match[1]);
    const end = parseInt(match[2]);
    const periods: number[] = [];
    for (let i = start; i <= end; i++) periods.push(i);
    return periods;
  }
  return [parseInt(cdmc) || 0];
}

// ── 考试抓取 ────────────────────────────────────────────────

export async function fetchExams(
  cookie: string,
  xnm?: number,
  xqm?: number
): Promise<ExamData[]> {
  const client = createClientWithCookie(BASE, cookie);

  const now = new Date();
  const year = xnm ?? (now.getMonth() >= 9 ? now.getFullYear() : now.getFullYear() - 1);
  const semester = xqm ?? ((now.getMonth() >= 9 || now.getMonth() <= 1) ? 3 : 12);

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
    return items.map((item: Record<string, unknown>) => ({
      subject: (item.kcmc as string) || "",
      date: (item.ksrq as string) || "",
      time: (item.kssj as string) || "",
      location: (item.cdmc as string) || "",
      seatNumber: (item.zwh as string) || "",
      ...item,
    }));
  } catch {
    return [];
  }
}

// ── 当前学期成绩 ────────────────────────────────────────────

export async function fetchCurrentGrades(
  cookie: string,
  xnm?: number,
  xqm?: number
): Promise<GradeCourse[]> {
  const client = createClientWithCookie(BASE, cookie);

  const now = new Date();
  const year = xnm ?? (now.getMonth() >= 9 ? now.getFullYear() : now.getFullYear() - 1);
  const semester = xqm ?? ((now.getMonth() >= 9 || now.getMonth() <= 1) ? 3 : 12);

  const resp = await client.req(
    "/cjcx/cjcx_cxDgXscj.html?doType=query&gnmkdm=N305005",
    {
      method: "POST",
      body: `xnm=${year}&xqm=${semester}&_search=false&nd=${Date.now()}&queryModel.showCount=200&queryModel.currentPage=1`,
    }
  );

  try {
    const data = JSON.parse(resp.body);
    return (data?.items || []).map((item: Record<string, unknown>) => ({
      course: (item.kcmc as string) || "",
      score: (item.cj as string) || (item.bfzcj as string) || "",
      credit: (item.xf as string) || "",
      type: (item.kcxzmc as string) || "",
      semester: ((item.xnmmc as string) || "") + ((item.xqmmc as string) || ""),
    }));
  } catch {
    return [];
  }
}

// ── Helper: 创建带预设 Cookie 的客户端 ──────────────────────

function createClientWithCookie(baseURL: string, initialCookie: string): HttpClient {
  const client = createClient(baseURL);
  // Pre-populate cookie by making a dummy request that sets cookies
  // Actually, we need to inject the cookie directly
  // Since createClient manages cookies internally, we need a different approach

  // Create a custom client that starts with the given cookie
  const cookieMap = new Map<string, string>();
  // Parse initial cookie string into map
  initialCookie.split(";").forEach((part) => {
    const trimmed = part.trim();
    const eq = trimmed.indexOf("=");
    if (eq > 0) {
      cookieMap.set(trimmed.slice(0, eq).trim(), trimmed.trim());
    }
  });

  function buildCookie(): string {
    return [...cookieMap.values()].join("; ");
  }

  async function req(
    urlPath: string,
    opts: HttpOptions = {}
  ): Promise<HttpResponse> {
    const u = new URL(urlPath, baseURL);

    return new Promise((resolve) => {
      const q = https.request(
        {
          method: opts.method || "GET",
          hostname: u.hostname,
          path: u.pathname + u.search,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            Cookie: buildCookie(),
            Referer: baseURL,
            ...(opts.body
              ? { "Content-Type": "application/x-www-form-urlencoded" }
              : {}),
          },
        },
        (r) => {
          const sc = r.headers["set-cookie"];
          if (sc) {
            sc.forEach((c: string) => {
              const kv = c.split(";")[0];
              const eq = kv.indexOf("=");
              if (eq > 0) {
                cookieMap.set(kv.slice(0, eq).trim(), kv.trim());
              }
            });
          }

          let b = "";
          r.on("data", (c: Buffer) => (b += c.toString()));
          r.on("end", () => {
            if (r.statusCode >= 300 && r.statusCode < 400) {
              const l = r.headers.location;
              if (l) {
                const redirectUrl = l.startsWith("http")
                  ? l
                  : baseURL + l;
                return req(redirectUrl, { method: "GET" }).then(resolve);
              }
            }
            resolve({
              status: r.statusCode || 0,
              body: b,
              headers: r.headers as Record<string, string | string[] | undefined>,
            });
          });
        }
      );

      q.on("error", (e: Error) =>
        resolve({ status: 0, body: "", headers: {} })
      );
      q.setTimeout(30000, () => q.destroy());

      if (opts.body) q.write(opts.body);
      q.end();
    });
  }

  return { req, getCookie: buildCookie };
}
