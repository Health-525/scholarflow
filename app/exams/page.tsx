"use client";

import { Plus, Trash2, Clock, CheckCircle2, RotateCcw, RefreshCw } from "lucide-react";
import { useState, useEffect, useCallback } from "react";

import { parseExamDate } from "@/lib/parse-exam-date";
import { useAuthStore } from "@/store/auth";
import type { Exam } from "@/types/exam";

// ── JWGL 原始格式 ────────────────────────────────────────────

interface JWGLExam {
  kch?: string;
  kcmc?: string;
  kssj?: string;
  jxdd?: string;
}

// ── API helpers ──────────────────────────────────────────────

function accountParams(schoolId: string | null, userId: string | null) {
  const p = new URLSearchParams();
  if (schoolId) p.set("schoolId", schoolId);
  if (userId) p.set("userId", userId);
  return p.toString();
}

async function apiGet(schoolId: string | null, userId: string | null): Promise<Exam[]> {
  const res = await fetch(`/api/exams?${accountParams(schoolId, userId)}`);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

async function apiAdd(
  exam: Omit<Exam, "id" | "source" | "status">,
  schoolId: string | null,
  userId: string | null
): Promise<Exam | null> {
  const res = await fetch("/api/exams", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ exam, schoolId, userId }),
  });
  const data = await res.json();
  return data.exam ?? null;
}

async function apiPatch(
  id: string,
  status: Exam["status"],
  schoolId: string | null,
  userId: string | null
) {
  await fetch("/api/exams", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, status, schoolId, userId }),
  });
}

async function apiDelete(
  id: string,
  schoolId: string | null,
  userId: string | null
) {
  await fetch(`/api/exams?id=${encodeURIComponent(id)}&${accountParams(schoolId, userId)}`, {
    method: "DELETE",
  });
}

async function apiImportJwgl(
  schoolId: string | null,
  userId: string | null
): Promise<{ added: number }> {
  // 1. 从 local-data 拉取教务原始考试数据
  const sid = schoolId || "njtech";
  const uid = userId || "default";
  const raw = await fetch(`/api/local-data?type=exams&schoolId=${sid}&userId=${uid}`);
  if (!raw.ok) return { added: 0 };
  const rawData = await raw.json();
  if (!Array.isArray(rawData) || rawData.length === 0) return { added: 0 };

  // 2. 映射格式
  const exams = rawData.map((e: JWGLExam) => {
    const timeMatch = (e.kssj || "").match(/\((\d{2}:\d{2}-\d{2}:\d{2})\)/);
    return {
      id: `jwgl-${e.kch || Math.random().toString(36).slice(2)}`,
      subject: e.kcmc || e.kch || "",
      date: parseExamDate(e.kssj),
      time: timeMatch ? timeMatch[1] : undefined,
      location: (e.jxdd || "").replace(/\(多\)/g, "").replace(/;/g, " / ") || undefined,
    };
  }).filter((e: { subject: string; date: string }) => e.subject && e.date);

  // 3. 批量写入（服务端自动去重，不恢复已删除的教务考试）
  const res = await fetch("/api/exams", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ exams, schoolId, userId }),
  });
  const data = await res.json();
  return { added: data.added ?? 0 };
}

// ── 倒计时格式化 ─────────────────────────────────────────────

function formatCountdown(dateStr: string): { text: string; urgency: "today" | "soon" | "normal" | "past" } {
  const now = new Date();
  const target = new Date(dateStr + "T23:59:59");
  const diffMs = target.getTime() - now.getTime();
  if (diffMs < 0) return { text: "已过期", urgency: "past" };
  const days = Math.floor(diffMs / 86400000);
  const hours = Math.floor((diffMs % 86400000) / 3600000);
  if (days === 0) return { text: hours > 0 ? `今天 · ${hours}h后` : "今天", urgency: "today" };
  if (days === 1) return { text: "明天", urgency: "today" };
  if (days <= 3) return { text: `${days} 天后`, urgency: "soon" };
  return { text: `${days} 天后`, urgency: "normal" };
}

const urgencyColor = {
  today: "text-rose-500",
  soon: "text-amber-500",
  normal: "text-muted-foreground",
  past: "text-muted-foreground",
};

const urgencyBg = {
  today: "bg-rose-500/10",
  soon: "bg-amber-500/10",
  normal: "bg-primary/10",
  past: "bg-secondary",
};

// ── 主组件 ───────────────────────────────────────────────────

export default function ExamsPage() {
  const { schoolId, userId } = useAuthStore((s) => s);

  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);

  // 表单字段
  const [subject, setSubject] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");

  // ── 数据加载 ─────────────────────────────────────────────

  const refresh = useCallback(async () => {
    const data = await apiGet(schoolId, userId);
    setExams(data);
  }, [schoolId, userId]);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  // ── 操作 ─────────────────────────────────────────────────

  const handleAdd = async () => {
    if (!subject.trim() || !date) return;
    const optimistic: Exam = {
      id: `pending-${Date.now()}`,
      subject: subject.trim(), date, time: time || undefined,
      location: location || undefined,
      source: "manual", status: "upcoming",
    };
    // 乐观更新
    setExams((prev) => [...prev, optimistic].sort((a, b) => a.date.localeCompare(b.date)));
    setSubject(""); setDate(""); setTime(""); setLocation("");

    const created = await apiAdd(
      { subject: optimistic.subject, date: optimistic.date, time: optimistic.time, location: optimistic.location },
      schoolId, userId
    );
    // 用服务端返回的真实 id 替换乐观项
    setExams((prev) => prev.map((e) => e.id === optimistic.id ? (created ?? optimistic) : e));
  };

  const handleComplete = async (id: string) => {
    setExams((prev) => prev.map((e) => e.id === id ? { ...e, status: "completed", completedAt: Date.now() } : e));
    await apiPatch(id, "completed", schoolId, userId);
  };

  const handleUncomplete = async (id: string) => {
    setExams((prev) => prev.map((e) => e.id === id ? { ...e, status: "upcoming", completedAt: undefined } : e));
    await apiPatch(id, "upcoming", schoolId, userId);
  };

  const handleDelete = async (id: string) => {
    setExams((prev) => {
      const target = prev.find((e) => e.id === id);
      if (!target) return prev;
      // 手动考试：彻底移除；教务考试：本地先标记 deleted
      if (target.source === "manual") return prev.filter((e) => e.id !== id);
      return prev.map((e) => e.id === id ? { ...e, status: "deleted" as const } : e);
    });
    await apiDelete(id, schoolId, userId);
  };

  const handleImport = async () => {
    setImporting(true);
    setImportMsg(null);
    const { added } = await apiImportJwgl(schoolId, userId);
    await refresh();
    setImportMsg(added > 0 ? `已导入 ${added} 场考试` : "没有新考试");
    setImporting(false);
    setTimeout(() => setImportMsg(null), 3000);
  };

  // ── 分区 ─────────────────────────────────────────────────

  const visible = exams.filter((e) => e.status !== "deleted");
  const upcoming = visible
    .filter((e) => e.status === "upcoming")
    .sort((a, b) => a.date.localeCompare(b.date));
  const completed = visible
    .filter((e) => e.status === "completed")
    .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));

  return (
    <div className="max-w-2xl mx-auto min-h-screen bg-background text-foreground animate-page pb-24 md:pb-8">

      {/* Header */}
      <div className="flex items-center gap-3 mb-6 py-4">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-primary/10">
          <Clock className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold font-display text-foreground">考试</h1>
          <p className="text-[12px] text-muted-foreground">
            {upcoming.length > 0 ? `${upcoming.length} 场待考` : "暂无待考科目"}
          </p>
        </div>
        <button
          onClick={handleImport}
          disabled={importing}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-medium bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${importing ? "animate-spin" : ""}`} />
          {importing ? "导入中…" : "导入教务数据"}
        </button>
      </div>

      {/* 导入提示 */}
      {importMsg && (
        <div className="mb-3 px-3 py-2 rounded-xl text-[12px] bg-primary/8 text-primary border border-primary/15 text-center">
          {importMsg}
        </div>
      )}

      {/* 添加表单 */}
      <div className="rounded-2xl p-4 mb-5 bg-card border border-border shadow-sm">
        <div className="flex items-center gap-2 flex-wrap">
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="科目名称"
            className="flex-1 min-w-[120px] px-3 py-2.5 rounded-xl text-[13px] outline-none bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:border-primary/40"
          />
          <input
            value={date}
            onChange={(e) => setDate(e.target.value)}
            type="date"
            className="px-3 py-2.5 rounded-xl text-[13px] outline-none bg-secondary border border-border text-foreground focus:border-primary/40"
          />
          <input
            value={time}
            onChange={(e) => setTime(e.target.value)}
            type="time"
            className="w-[90px] px-3 py-2.5 rounded-xl text-[13px] outline-none bg-secondary border border-border text-foreground focus:border-primary/40"
          />
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="考场（选填）"
            className="flex-1 min-w-[80px] px-3 py-2.5 rounded-xl text-[13px] outline-none bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:border-primary/40"
          />
          <button
            onClick={handleAdd}
            disabled={!subject.trim() || !date}
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-primary text-primary-foreground disabled:opacity-40 transition-opacity"
            aria-label="添加考试"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 加载中 */}
      {loading && (
        <div className="text-center py-12 text-[13px] text-muted-foreground">加载中…</div>
      )}

      {/* 待考列表 */}
      {!loading && (
        <div className="space-y-2">
          {upcoming.length === 0 && completed.length === 0 && (
            <p className="text-center text-[13px] text-muted-foreground py-12">
              添加考试日期，自动倒计时
            </p>
          )}
          {upcoming.length === 0 && completed.length > 0 && (
            <p className="text-center text-[13px] text-muted-foreground py-6">暂无待考科目 🎉</p>
          )}

          {upcoming.map((exam) => {
            const cd = formatCountdown(exam.date);
            return (
              <div
                key={exam.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border group"
              >
                {/* 完成按钮 */}
                <button
                  onClick={() => handleComplete(exam.id)}
                  className="w-5 h-5 shrink-0 rounded-full border-2 border-border hover:border-primary transition-colors flex items-center justify-center"
                  aria-label={`标记「${exam.subject}」已完成`}
                  title="标记完成"
                />

                {/* 倒计时图标 */}
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${urgencyBg[cd.urgency]}`}>
                  <Clock className={`w-4 h-4 ${urgencyColor[cd.urgency]}`} />
                </div>

                {/* 正文 */}
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-foreground truncate">{exam.subject}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {exam.date}
                    {exam.time ? ` · ${exam.time}` : ""}
                    {exam.location ? ` · ${exam.location}` : ""}
                    {exam.source === "jwgl" && (
                      <span className="ml-1.5 text-[10px] text-primary/60 bg-primary/8 px-1.5 py-0.5 rounded-md">教务</span>
                    )}
                  </div>
                </div>

                {/* 倒计时文字 */}
                <span className={`text-[12px] font-semibold tabular-nums shrink-0 ${urgencyColor[cd.urgency]}`}>
                  {cd.text}
                </span>

                {/* 删除 */}
                <button
                  onClick={() => handleDelete(exam.id)}
                  className="p-1.5 rounded-lg text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-rose-500 transition-all"
                  aria-label={`删除「${exam.subject}」`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* 已完成列表 */}
      {!loading && completed.length > 0 && (
        <details className="mt-5" open={upcoming.length === 0}>
          <summary className="flex items-center gap-2 text-[12px] text-muted-foreground cursor-pointer hover:text-foreground transition-colors select-none list-none">
            <CheckCircle2 className="w-3.5 h-3.5" />
            已完成 ({completed.length})
          </summary>
          <div className="space-y-2 mt-2">
            {completed.map((exam) => (
              <div
                key={exam.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border opacity-60 group"
              >
                {/* 取消完成按钮 */}
                <button
                  onClick={() => handleUncomplete(exam.id)}
                  className="w-5 h-5 shrink-0 rounded-full bg-primary/20 border-2 border-primary/40 flex items-center justify-center hover:bg-primary/30 transition-colors"
                  aria-label={`取消「${exam.subject}」的完成状态`}
                  title="取消完成"
                >
                  <div className="w-2 h-2 rounded-full bg-primary/60" />
                </button>

                <CheckCircle2 className="w-4 h-4 shrink-0 text-primary/50" />

                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-muted-foreground line-through truncate">
                    {exam.subject}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {exam.date}
                    {exam.location ? ` · ${exam.location}` : ""}
                    {exam.completedAt && (
                      <span className="ml-1.5">· 完成于 {new Date(exam.completedAt).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" })}</span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleUncomplete(exam.id)}
                  className="p-1.5 rounded-lg text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-primary transition-all"
                  aria-label="撤销完成"
                  title="撤销完成"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>

                {exam.source === "manual" && (
                  <button
                    onClick={() => handleDelete(exam.id)}
                    className="p-1.5 rounded-lg text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-rose-500 transition-all"
                    aria-label={`删除「${exam.subject}」`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
