"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Clock } from "lucide-react";

interface Exam {
  id: string;
  subject: string;
  date: string;   // YYYY-MM-DD
  time?: string;  // HH:MM
  location?: string;
  notes?: string;
}

const LS_KEY = "sf_exams";

function load(): Exam[] {
  try { const raw = localStorage.getItem(LS_KEY); if (raw) return JSON.parse(raw); } catch { /* ignore */ }
  return [];
}

// Auto-import from JWGL exam data
async function importJWGLExams(): Promise<Exam[]> {
  try {
    const res = await fetch("/api/local-data?type=exams");
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data.map((e: any) => {
      const dateMatch = (e.kssj || "").match(/\d{4}-\d{2}-\d{2}/);
      const timeMatch = (e.kssj || "").match(/\((\d{2}:\d{2}-\d{2}:\d{2})\)/);
      return {
        id: "jwgl-" + (e.kch || Math.random()),
        subject: e.kcmc || e.kch || "",
        date: dateMatch ? dateMatch[0] : "",
        time: timeMatch ? timeMatch[1] : "",
        location: (e.jxdd || "").replace(/\(多\)/g, "").replace(/;/g, " / "),
      };
    });
  } catch { return []; }
}
function save(exams: Exam[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(exams)); } catch { /* ignore */ }
}

function formatCountdown(targetDate: string): { text: string; urgent: boolean } {
  const now = new Date();
  const target = new Date(targetDate + "T23:59:59");
  const diffMs = target.getTime() - now.getTime();

  if (diffMs < 0) return { text: "已结束", urgent: false };

  const days = Math.floor(diffMs / 86400000);
  const hours = Math.floor((diffMs % 86400000) / 3600000);

  if (days === 0) return { text: `今天${hours > 0 ? ` ${hours}小时后` : ""}`, urgent: true };
  if (days === 1) return { text: "明天", urgent: true };
  if (days <= 3) return { text: `${days} 天后`, urgent: true };
  if (days <= 7) return { text: `${days} 天后`, urgent: false };
  return { text: `${days} 天后`, urgent: false };
}

export default function ExamsPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [subject, setSubject] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");

  useEffect(() => {
    const init = async () => {
      const stored = load();
      setExams(stored);
      try {
        const jwglExams = await importJWGLExams();
        if (jwglExams.length > 0) {
          const merged = [...stored];
          for (const je of jwglExams) {
            if (!merged.some(e => e.subject === je.subject)) merged.push(je);
          }
          save(merged);
          setExams(merged);
        }
      } catch {}
    };
    init();
  }, []);

  const add = () => {
    if (!subject.trim() || !date) return;
    const exam: Exam = { id: Date.now().toString(36), subject: subject.trim(), date, time: time || undefined, location: location || undefined };
    const updated = [...exams, exam].sort((a, b) => a.date.localeCompare(b.date));
    setExams(updated); save(updated);
    setSubject(""); setDate(""); setTime(""); setLocation("");
  };

  const del = (id: string) => { const u = exams.filter(e => e.id !== id); setExams(u); save(u); };

  const upcoming = exams.filter(e => new Date(e.date + "T23:59:59").getTime() > Date.now());

  return (
    <div className="pb-24 md:pb-0 max-w-2xl mx-auto">
      <div className="mb-6 py-4">
        <h1 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>考试倒计时</h1>
        <p className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>{upcoming.length} 场考试待考</p>
      </div>

      {/* Add */}
      <div className="rounded-2xl p-4 mb-4" style={{ border: "1px solid var(--border)", backgroundColor: "var(--surface-card)" }}>
        <div className="flex items-center gap-2 flex-wrap">
          <input value={subject} onChange={e => setSubject(e.target.value)} onKeyDown={e => e.key === "Enter" && add()} placeholder="科目" className="flex-1 min-w-[100px] px-3 py-2.5 rounded-xl text-[13px] outline-none" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
          <input value={date} onChange={e => setDate(e.target.value)} type="date" className="px-3 py-2.5 rounded-xl text-[13px] outline-none" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
          <input value={time} onChange={e => setTime(e.target.value)} type="time" className="w-20 px-3 py-2.5 rounded-xl text-[13px] outline-none" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
          <button onClick={add} className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "var(--accent)", color: "#fff" }}>
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Exam list */}
      <div className="space-y-2">
        {exams.map(e => {
          const cd = formatCountdown(e.date);
          return (
            <div key={e.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ border: "1px solid var(--border-subtle)", backgroundColor: "var(--surface-card)" }}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0`} style={{ backgroundColor: cd.urgent ? "rgba(239,68,68,0.1)" : "var(--accent-soft)" }}>
                <Clock className="w-4 h-4" style={{ color: cd.urgent ? "#ef4444" : "var(--accent)" }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium" style={{ color: "var(--text-primary)" }}>{e.subject}</div>
                <div className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                  {e.date} {e.time || ""} {e.location || ""}
                </div>
              </div>
              <div className={`text-[12px] font-bold tabular-nums shrink-0`} style={{ color: cd.urgent ? "#ef4444" : "var(--text-secondary)" }}>
                {cd.text}
              </div>
              <button onClick={() => del(e.id)} className="p-1.5 rounded-lg" style={{ color: "var(--text-muted)" }}>
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          );
        })}
        {exams.length === 0 && (
          <p className="text-center text-[12px] py-8" style={{ color: "var(--text-tertiary)" }}>添加考试日期，自动倒计时</p>
        )}
      </div>
    </div>
  );
}
