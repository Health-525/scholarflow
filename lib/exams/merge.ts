import type { Exam } from "@/types/exam";

interface MinimalExam {
  id?: string;
  subject: string;
  date: string;
  time?: string;
  location?: string;
  notes?: string;
}

function examKey(subject: string, date: string) {
  return `${subject}|${date}`;
}

/**
 * 将教务系统抓取的考试列表合并到本地存储。
 * - 保留用户手动添加的考试
 * - 保留已有教务考试的完成/删除状态
 * - 以 (subject, date) 为键去重，避免重复导入
 */
export function mergeExams(existing: Exam[], fetched: MinimalExam[]): Exam[] {
  const out: Exam[] = [];
  const jwglMap = new Map<string, Exam>();

  for (const e of existing) {
    if (e.source === "manual" || e.status === "deleted") {
      out.push(e);
    } else if (e.source === "jwgl") {
      jwglMap.set(examKey(e.subject, e.date), e);
    }
  }

  for (const raw of fetched) {
    if (!raw.subject || !raw.date) continue;
    const key = examKey(raw.subject, raw.date);
    const dup = jwglMap.get(key);
    if (dup) {
      jwglMap.delete(key);
      out.push({
        ...dup,
        time: raw.time ?? dup.time,
        location: raw.location ?? dup.location,
        notes: raw.notes ?? dup.notes,
      });
    } else {
      out.push({
        id: raw.id ?? `jwgl-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        subject: raw.subject,
        date: raw.date,
        time: raw.time,
        location: raw.location,
        notes: raw.notes,
        source: "jwgl",
        status: "upcoming",
      } as Exam);
    }
  }

  // 教务系统中已下架、但本地有状态（如已完成）的考试，继续保留
  for (const e of jwglMap.values()) {
    out.push(e);
  }

  return out.sort((a, b) => a.date.localeCompare(b.date));
}
