/**
 * 考试模块 API 封装
 *
 * 把原来内联在 app/exams/page.tsx 顶部的 7 个 API helper 提取到这里，
 * 供 exams 页面及未来其他入口复用。
 */

import { apiDelete, apiGet, apiPatch, apiPost, checkOk } from "@/lib/api/client";
import { parseExamDate } from "@/lib/parse-exam-date";
import type { Exam } from "@/types/exam";

// ── JWGL 原始格式 ────────────────────────────────────────────

interface JWGLExam {
  kch?: string;
  kcmc?: string;
  kssj?: string;
  jxdd?: string;
}

// ── CRUD ─────────────────────────────────────────────────────

export async function fetchExams(
  schoolId: string | null,
  userId: string | null
): Promise<Exam[]> {
  const data = await apiGet<unknown>("/api/exams", schoolId, userId);
  return Array.isArray(data) ? data : [];
}

export async function addExam(
  exam: Omit<Exam, "id" | "source" | "status">,
  schoolId: string | null,
  userId: string | null
): Promise<Exam> {
  const data = await apiPost<{ exam?: Exam }>("/api/exams", {
    exam,
    schoolId,
    userId,
  });
  if (!data.exam) throw new Error("服务端未返回考试数据");
  return data.exam;
}

export async function patchExam(
  id: string,
  status: Exam["status"],
  schoolId: string | null,
  userId: string | null
): Promise<void> {
  await apiPatch("/api/exams", { id, status, schoolId, userId });
}

export async function deleteExam(
  id: string,
  schoolId: string | null,
  userId: string | null
): Promise<void> {
  await apiDelete(
    `/api/exams?id=${encodeURIComponent(id)}`,
    schoolId,
    userId
  );
}

// ── 教务导入 ─────────────────────────────────────────────────

export async function importExamsFromJwgl(
  schoolId: string | null,
  userId: string | null
): Promise<{ added: number }> {
  const sid = schoolId || "njtech";
  const uid = userId || "default";
  const raw = await fetch(
    `/api/local-data?type=exams&schoolId=${sid}&userId=${uid}`
  );
  if (!raw.ok) return { added: 0 };
  const rawData = await raw.json();
  if (!Array.isArray(rawData) || rawData.length === 0) return { added: 0 };

  const exams = rawData
    .map((e: JWGLExam) => {
      const timeMatch = (e.kssj || "").match(/\((\d{2}:\d{2}-\d{2}:\d{2})\)/);
      return {
        id: `jwgl-${e.kch || Math.random().toString(36).slice(2)}`,
        subject: e.kcmc || e.kch || "",
        date: parseExamDate(e.kssj),
        time: timeMatch ? timeMatch[1] : undefined,
        location:
          (e.jxdd || "").replace(/\(多\)/g, "").replace(/;/g, " / ") ||
          undefined,
      };
    })
    .filter((e: { subject: string; date: string }) => e.subject && e.date);

  const res = await fetch("/api/exams", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ exams, schoolId, userId }),
  });
  await checkOk(res);
  const data = await res.json();
  return { added: data.added ?? 0 };
}
