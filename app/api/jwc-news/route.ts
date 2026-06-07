import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const candidates = [
      path.join(process.cwd(), "..", "timetable", "_out", "jwc_news.json"),
      path.join(process.cwd(), "..", "..", "timetable", "_out", "jwc_news.json"),
      path.join(process.cwd(), "..", "..", "..", "timetable", "_out", "jwc_news.json"),
    ];
    for (const p of candidates) {
      try { if (fs.existsSync(p)) return NextResponse.json(JSON.parse(fs.readFileSync(p, "utf8"))); } catch {}
    }
    return NextResponse.json([], { status: 200 });
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
