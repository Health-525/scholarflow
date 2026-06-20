import type { ExamData } from "../types";

function pickString(row: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

function parseExamTime(row: Record<string, unknown>): string {
  const direct = pickString(row, ["KSSJ", "kssj", "SJKSSJ", "sjkssj"]);
  if (direct) return direct;

  const display = pickString(row, ["KSSJ_DISPLAY", "kssj_display", "SJKSSJ_DISPLAY", "sjkssj_display"]);
  const match = display.match(/\d{2}:\d{2}(?:-\d{2}:\d{2})?/);
  return match?.[0] || "";
}

function normalizeExamRow(row: Record<string, unknown>): ExamData | null {
  const subject = pickString(row, ["KCMC", "kcmc", "KCM", "kcm"]);
  const date = pickString(row, ["KSRQ", "ksrq", "SJKSRQ", "sjksrq"]);
  if (!subject || !date) return null;

  const location = pickString(row, [
    "CDMC",
    "cdmc",
    "JSMC",
    "jsmc",
    "JASMC",
    "jasmc",
    "CDMC_DISPLAY",
    "cdmc_display",
    "JASDM_DISPLAY",
    "jasdm_display",
    "JXLDM_DISPLAY",
    "jxldm_display",
  ]);

  const seatNumber = pickString(row, ["ZWH", "zwh"]);
  const notes = pickString(row, ["KSDM_DISPLAY", "ksdm_display", "PKSM", "pksm", "KSSM", "kssm"]);

  return {
    subject,
    date,
    time: parseExamTime(row),
    location,
    seatNumber,
    ...(notes ? { notes } : {}),
  };
}

function collectExamRows(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) {
    return payload.filter((item): item is Record<string, unknown> => !!item && typeof item === "object");
  }

  if (!payload || typeof payload !== "object") return [];

  const root = payload as Record<string, unknown>;
  const query = (
    (root.datas as Record<string, unknown> | undefined)?.queryMyExamArrangeMent ??
    root.data ??
    root
  ) as Record<string, unknown> | unknown;

  if (Array.isArray(query)) {
    return query.filter((item): item is Record<string, unknown> => !!item && typeof item === "object");
  }

  if (!query || typeof query !== "object") return [];

  const container = query as Record<string, unknown>;
  const buckets = [container.rows, container.arranged, container.notArranged, container.data];
  const rows: Record<string, unknown>[] = [];

  for (const bucket of buckets) {
    if (!Array.isArray(bucket)) continue;
    rows.push(...bucket.filter((item): item is Record<string, unknown> => !!item && typeof item === "object"));
  }

  return rows;
}

export function parseHebauExamResponse(payload: unknown): ExamData[] {
  const seen = new Set<string>();
  const exams: ExamData[] = [];

  for (const row of collectExamRows(payload)) {
    const exam = normalizeExamRow(row);
    if (!exam) continue;

    const key = [exam.subject, exam.date, exam.time || "", exam.location || ""].join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    exams.push(exam);
  }

  return exams;
}
