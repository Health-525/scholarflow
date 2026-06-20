import { NextResponse } from "next/server";
import { z } from "zod";

import { resolveUserId } from "@/lib/account-prefix";
import { forbiddenResponse, isTrustedOrigin } from "@/lib/auth/origin";
import { decryptPassword } from "@/lib/crypto-password";
import { buildDashboardSummary } from "@/lib/dashboard/summary";
import { mergeExams } from "@/lib/exams/merge";
import { NJTECH_PERIOD_TIMES } from "@/lib/schools/njtech/jwgl";
import { getAdapter } from "@/lib/schools/registry";
import { getServerDB } from "@/lib/server-db";
import type { Exam } from "@/types/exam";

const fetchAllBodySchema = z.object({
  schoolId: z.string().min(1),
  cookie: z.string().optional(),
  username: z.string().min(1).optional(),
  password: z.string().optional(),
});

/**
 * POST /api/fetch/all
 * 一次性抓取所有数据（课表、考试、成绩、通知）
 * 图书馆需要单独的 JWT，不在此处抓取
 *
 * 凭证生命周期(local-first-sync):
 * - 有有效 JWC_Cookie → 直接抓取(行为不变)。
 * - JWC_Cookie 过期/不存在(getCredentials 返回 null,内部已校验 expiresAt):
 *   - 若调用方(调度器/记住密码)传入 password → 用学校 adapter 静默重登,
 *     拿到新凭证后保存并继续抓取(R8.3)。
 *   - 否则返回结构化 needsManualLogin 错误,提示手动重新登录(R8.4)。
 * - 任意抓取项失败时仅标记为「失败」,绝不删除/覆盖 Local_Store 既有数据(R2.5/6.5/8.5)。
 */
export async function POST(request: Request) {
  try {
    if (!isTrustedOrigin(request, { allowInternalToken: true })) {
      return forbiddenResponse();
    }

    const parse = fetchAllBodySchema.safeParse(await request.json());
    if (!parse.success) {
      return NextResponse.json({ error: "invalid input", issues: parse.error.issues }, { status: 400 });
    }
    const { schoolId, username, password } = parse.data;

    if (!username?.trim()) {
      return NextResponse.json({ error: "missing username" }, { status: 401 });
    }

    const adapter = getAdapter(schoolId);
    if (!adapter) {
      return NextResponse.json({ error: `unknown school: ${schoolId}` }, { status: 400 });
    }

    // 从数据库读取已保存的凭证（login 时保存的 cookie）
    // getCredentials 内部已校验 expires_at —— 过期时返回 null,因此 null 同时覆盖
    //「凭证不存在」与「JWC_Cookie 过期」两种情况。
    const db = getServerDB();
    const userId = resolveUserId(username);

    // 身份校验：显式提供密码（调度器/记住密码）视为已授权；
    // 否则必须请求的是当前已登录/最近使用过的账号。
    if (!password) {
      const active = db.findActiveCredentials();
      const recent = db.findMostRecentCredential();
      const allowed = active || recent;
      if (!allowed || allowed.userId !== userId || allowed.schoolId !== schoolId) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
      }
    }

    let savedCreds = db.getCredentials(schoolId, userId);

    // JWC_Cookie 过期或不存在 → 尝试静默重登(有 password)或提示手动登录。
    if (!savedCreds) {
      // 尝试从请求体、或本地 DB 中获取已保存的密码（前端刷新时可能未传 password，
      // 此时从 DB 中读取记住的密码用于静默重登）。
      const resolvedPassword =
        password ||
        decryptPassword(
          (db.readData(`credential-password:${schoolId}:${userId}`) as { password?: string } | null)?.password || ""
        ) ||
        undefined;

      if (resolvedPassword) {
        try {
          // 用记住的密码静默重新登录教务系统,拿到新 cookie 后保存(R8.3)。
          const session = await adapter.login({ username, password: resolvedPassword });
          db.saveCredentials(schoolId, userId, session.data, session.expiresAt);
          savedCreds = session.data;
        } catch {
          // 静默重登失败(如密码失效)→ 需要手动重新登录,且不触碰本地缓存。
          return NextResponse.json(
            { ok: false, needsManualLogin: true, error: "凭证已过期，请重新登录" },
            { status: 401 }
          );
        }
      } else {
        // 无可用密码 → 提示用户手动重新登录(R8.4),保留本地缓存不变。
        return NextResponse.json(
          { ok: false, needsManualLogin: true, error: "凭证已过期，请重新登录" },
          { status: 401 }
        );
      }
    }

    const credentials = {
      schoolId,
      data: savedCreds,
      expiresAt: Date.now() + 30 * 60 * 1000,
    };

    const results: Record<string, string> = {};

    // 数据 key 前缀 — 实现账号隔离
    const prefix = `${schoolId}:${userId}`;

    // 课表 — 加上 meta 字段（前端需要 week1_monday 和 tz）
    try {
      const courses = await adapter.fetchSchedule(credentials);

      // 从学校适配器获取学期配置
      const semesterInfo = adapter.getCurrentSemester?.() || {
        year: "2025", semester: "2", week1Monday: "2026-03-02",
      };
      const yearNum = Number.parseInt(semesterInfo.year, 10);

      db.writeData(`schedule:${prefix}`, {
        courses,
        meta: {
          week1_monday: semesterInfo.week1Monday,
          tz: "Asia/Shanghai",
          semester: `${yearNum}-${yearNum + 1}-${semesterInfo.semester}`,
          schoolId,
        },
        periodTimes: NJTECH_PERIOD_TIMES,
      });
      results.schedule = `${courses.length} 门课程`;
    } catch (e) {
      results.schedule = `失败: ${(e as Error).message}`;
    }

    // 考试（合并到 exams:<prefix>，保留手动添加与完成/删除状态）
    try {
      const fetchedExams = await adapter.fetchExams(credentials);
      const existingExams = (db.readData(`exams:${prefix}`) as Exam[]) || [];
      const merged = mergeExams(existingExams, fetchedExams as unknown as import("@/types/exam").Exam[]);
      db.writeData(`exams:${prefix}`, merged);
      results.exams = `${fetchedExams.length} 门考试`;
    } catch (e) {
      results.exams = `失败: ${(e as Error).message}`;
    }

    // 成绩
    try {
      const grades = await adapter.fetchGrades(credentials);
      db.writeData(`grades:${prefix}`, grades);
      db.writeData(`student:${prefix}`, {
        studentId: username || savedCreds.username || "",
        gpa: grades.gpa,
        totalCredits: grades.totalCredits,
        courseCount: grades.allCourses.length,
      });
      results.grades = `GPA ${grades.gpa}, ${grades.allCourses.length} 门`;
    } catch (e) {
      results.grades = `失败: ${(e as Error).message}`;
    }

    // 教务通知
    if (adapter.fetchJwcNews) {
      try {
        const existing = (db.readData(`jwc-news:${schoolId}`) as import("@/lib/schools/types").NewsItem[]) || [];
        const news = await adapter.fetchJwcNews(existing);
        db.writeData(`jwc-news:${schoolId}`, news);
        results.jwcNews = `${news.length} 条通知`;
      } catch (e) {
        results.jwcNews = `失败: ${(e as Error).message}`;
      }
    }

    // 重新生成 dashboard summary — 使用实际数据而非硬编码
    db.writeData(`dashboard-summary:${prefix}`, buildDashboardSummary(db, prefix));

    return NextResponse.json({ ok: true, results });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
