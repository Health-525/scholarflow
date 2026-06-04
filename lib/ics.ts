import { RawScheduleData, getItemsForDate } from "./schedule/schedule";
import { normalizeDate } from "./schedule/timezone";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function formatICSDate(d: Date): string {
  return (
    d.getFullYear() +
    pad2(d.getMonth() + 1) +
    pad2(d.getDate()) +
    "T" +
    pad2(d.getHours()) +
    pad2(d.getMinutes()) +
    "00"
  );
}

function generateUID(startTime: Date, title: string): string {
  const timeStr = formatICSDate(startTime);
  const hash = title.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return `${timeStr}-${hash}@scholarflow`;
}

function esc(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

export function buildWeekICS(schedule: RawScheduleData, baseDate: Date): string {
  const normalizedBase = normalizeDate(baseDate);
  const weekday = ((baseDate.getDay() + 6) % 7) + 1; // 1..7 Mon..Sun
  const monday = new Date(normalizedBase);
  monday.setDate(normalizedBase.getDate() - (weekday - 1));

  const events: Array<{
    start: Date;
    end: Date;
    summary: string;
    location?: string;
    description?: string;
  }> = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);

    const { items } = getItemsForDate(schedule, normalizeDate(d));
    for (const it of items) {
      if (!it.timeText) continue;
      const [startStr, endStr] = it.timeText.split("-");
      if (!startStr || !endStr) continue;
      const start = normalizeDate(d);
      const end = normalizeDate(d);
      const [sh, sm] = startStr.split(":").map(Number);
      const [eh, em] = endStr.split(":").map(Number);
      if (
        !Number.isFinite(sh) ||
        !Number.isFinite(sm) ||
        !Number.isFinite(eh) ||
        !Number.isFinite(em)
      )
        continue;
      start.setHours(sh, sm, 0, 0);
      end.setHours(eh, em, 0, 0);

      const descParts: string[] = [];
      if (it.kind === "course" && it.teacher) descParts.push(`老师: ${it.teacher}`);

      events.push({
        start,
        end,
        summary: it.title,
        location: it.location,
        description: descParts.join("\n") || undefined,
      });
    }
  }

  const lines: string[] = [];
  lines.push("BEGIN:VCALENDAR");
  lines.push("VERSION:2.0");
  lines.push("PRODID:-//ScholarFlow//ScholarFlow//CN");
  lines.push("CALSCALE:GREGORIAN");
  lines.push("METHOD:PUBLISH");

  for (const ev of events) {
    const uid = generateUID(ev.start, ev.summary);
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${formatICSDate(new Date())}`);
    lines.push(`DTSTART:${formatICSDate(ev.start)}`);
    lines.push(`DTEND:${formatICSDate(ev.end)}`);
    lines.push(`SUMMARY:${esc(ev.summary)}`);
    if (ev.location) lines.push(`LOCATION:${esc(ev.location)}`);
    if (ev.description) lines.push(`DESCRIPTION:${esc(ev.description)}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

/**
 * 验证 ICS 内容格式
 */
export function validateICS(icsContent: string): boolean {
  const required = ["BEGIN:VCALENDAR", "END:VCALENDAR", "VERSION:2.0"];
  return required.every((tag) => icsContent.includes(tag));
}

/**
 * 下载 ICS 文件
 */
export function downloadICS(icsContent: string, filename: string): void {
  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
