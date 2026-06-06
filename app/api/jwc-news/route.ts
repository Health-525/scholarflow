import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    // Try local timetable repo first
    const paths = [
      "D:\\A\\timetable\\_out\\jwc_news.json",
      path.join(process.cwd(), "..", "timetable", "_out", "jwc_news.json"),
      path.join(process.cwd(), "_out", "jwc_news.json"),
    ];
    for (const p of paths) {
      if (fs.existsSync(p)) {
        const data = JSON.parse(fs.readFileSync(p, "utf8"));
        return NextResponse.json(data);
      }
    }
    return NextResponse.json([], { status: 200 });
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
