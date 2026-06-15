import { NextResponse } from "next/server";
import { getServerDB } from "@/lib/server-db";

/**
 * POST /api/debug/fix-schedule
 * 修复数据库中的课表数据：重新计算 periods/location/weeks
 */
export async function POST() {
  try {
    const db = getServerDB();
    const schedule = db.readData("schedule") as Record<string, unknown> | null;

    if (!schedule || !Array.isArray(schedule.courses)) {
      return NextResponse.json({ error: "No schedule data found" }, { status: 404 });
    }

    const courses = schedule.courses as Record<string, unknown>[];
    let fixedCount = 0;

    for (const c of courses) {
      // Fix periods: parse from jc field (e.g. "1-2节")
      const jc = (c.jc as string) || (c.jcor as string) || "";
      if (jc) {
        const match = jc.match(/(\d+)-(\d+)/);
        if (match) {
          const start = parseInt(match[1]);
          const end = parseInt(match[2]);
          const periods: number[] = [];
          for (let i = start; i <= end; i++) periods.push(i);
          c.periods = periods;
          fixedCount++;
        } else {
          const single = parseInt(jc);
          if (single > 0) {
            c.periods = [single];
            fixedCount++;
          }
        }
      }

      // Fix location: use cdmc (教室名) instead of xqmc (校区名)
      c.location = (c.cdmc as string) || (c.xqmc as string) || (c.location as string) || "";

      // Fix weeks: remove "周" suffix from zcd
      const zcd = (c.zcd as string) || (c.weeks as string) || "";
      c.weeks = zcd.replace(/周/g, "").trim();
    }

    // Add periodTimes
    schedule.periodTimes = {
      "1": "08:10-08:55",
      "2": "09:05-09:50",
      "3": "10:20-11:05",
      "4": "11:15-12:00",
      "5": "14:00-14:45",
      "6": "14:55-15:40",
      "7": "16:00-16:45",
      "8": "16:55-17:40",
      "9": "19:00-19:45",
      "10": "19:55-20:40",
    };

    db.writeData("schedule", schedule);

    // Verify
    const fixed = db.readData("schedule") as Record<string, unknown>;
    const fixedCourses = (fixed.courses as Record<string, unknown>[]).slice(0, 3);
    const sample = fixedCourses.map(c => ({
      title: c.title,
      periods: c.periods,
      weeks: c.weeks,
      location: c.location,
    }));

    return NextResponse.json({
      ok: true,
      fixedCount,
      totalCourses: courses.length,
      hasPeriodTimes: !!fixed.periodTimes,
      sample,
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
