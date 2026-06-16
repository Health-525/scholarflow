import { NextResponse } from "next/server";

import { getServerDB } from "@/lib/server-db";

/**
 * GET /api/jwc-news?schoolId=<schoolId>
 *
 * 教务通知按学校隔离，默认读取 njtech。
 * 数据由 /api/fetch/all 写入 SQLite，不再依赖 timetable/_out 文件。
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get("schoolId") || "njtech";
    const db = getServerDB();
    const news = db.readData(`jwc-news:${schoolId}`) || [];
    return NextResponse.json(news);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
