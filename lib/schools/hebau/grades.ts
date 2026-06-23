/**
 * 河北农业大学 — 成绩 + GPA (5.0 满绩)
 */

import * as http from "http";
import * as https from "https";

import type { GradeCourse, GradeResult } from "../types";

const URP_URL = "http://urp.hebau.edu.cn:1009";

function toGP(score: string): number {
  const s = Number(score);
  if (Number.isNaN(s)) {
    const m: Record<string, number> = { 优秀: 4.5, 良好: 3.5, 中等: 2.5, 及格: 1.5, 不及格: 0, 合格: 3.5, 不合格: 0 };
    return m[score.trim()] ?? 0;
  }
  if (s < 60) return 0;
  return Math.round((s / 10 - 5) * 10) / 10;
}

function isRequired(t: string): boolean {
  const value = t.trim();
  return value === "001" || value === "必修" || value.includes("必修");
}

function urpReq(path: string, cookie: string, body: string): Promise<{ statusCode: number; body: string }> {
  return new Promise((resolve, reject) => {
    const u = new URL(path, URP_URL);
    const t = u.protocol === "https:" ? https : http;
    const req = t.request(u, {
      method: "POST",
      headers: {
        Cookie: cookie, Accept: "application/json, text/javascript, */*; q=0.01",
        "X-Requested-With": "XMLHttpRequest", "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Referer: `${URP_URL}/jwapp/sys/cjcx/*default/index.do`,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      rejectUnauthorized: process.env.SCHOLARFLOW_INSECURE_TLS !== "1",
    }, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (c: Buffer) => chunks.push(c));
      res.on("end", () => resolve({ statusCode: res.statusCode || 0, body: Buffer.concat(chunks).toString("utf-8") }));
    });
    req.on("error", reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error("超时")); });
    req.write(body);
    req.end();
  });
}

export async function fetchAllGrades(cookie: string, _username: string): Promise<GradeResult> {
  const allCourses: GradeCourse[] = [];
  const y = new Date().getFullYear();
  for (let yr = y - 4; yr <= y; yr++) {
    for (const sem of ["1", "2"]) {
      try {
        const qs = JSON.stringify([{ name: "XNXQDM", value: `${yr}-${yr + 1}-${sem}`, linkOpt: "and", builder: "m_value_equal" }, { name: "SFYX", caption: "是否有效", linkOpt: "AND", builder: "m_value_equal", value: "1", value_display: "是" }, { name: "SHOWMAXCJ", caption: "显示最高成绩", linkOpt: "AND", builder: "m_value_equal", value: "0", value_display: "否" }]);
        const body = `querySetting=${encodeURIComponent(qs)}&*order=-XNXQDM,-KCH,-KXH&pageSize=100&pageNumber=1`;
        const resp = await urpReq("/jwapp/sys/cjcx/modules/cjcx/xscjcx.do", cookie, body);
        const d = JSON.parse(resp.body);
        const rows =
          d?.datas?.xscjcx?.rows ||
          d?.data?.rows ||
          d?.data ||
          d?.rows ||
          d ||
          [];
        if (Array.isArray(rows)) for (const r of rows) allCourses.push({
          course: (r.KCMC || r.kcmc || r.XSKCM || r.xskcm || r.KCM || r.kcm || "") as string,
          score: String(r.ZCJ || r.zcj || r.CJ || r.cj || "0"),
          credit: String(r.XF || r.xf || "0"),
          type: String(r.KCXZDM || r.kcxzdm || r.KCXZDM_DISPLAY || r.kcxzdm_display || r.KCXZ || r.kcxz || "选修"),
          semester: `${yr}-${yr + 1}-${sem}`,
        });
      } catch {}
    }
  }
  const best = new Map<string, GradeCourse>();
  for (const c of allCourses) {
    const k = c.course;
    const e = best.get(k);
    if (!e || Number(c.score) > Number(e.score)) best.set(k, c);
  }
  const deduped = [...best.values()];
  const reqCourses = deduped.filter((c) => isRequired(c.type));
  let totalGp = 0, totalCredits = 0;
  for (const c of reqCourses) { totalGp += toGP(c.score) * (Number(c.credit) || 0); totalCredits += Number(c.credit) || 0; }
  return { gpa: totalCredits > 0 ? (totalGp / totalCredits).toFixed(2) : "0.00", totalCredits, requiredCourses: reqCourses.length, allCourses: deduped };
}
