import { NextResponse } from "next/server";
import { z } from "zod";

import { forbiddenResponse, isTrustedOrigin } from "@/lib/auth/origin";
import { getServerDB } from "@/lib/server-db";

const jwcNewsQuerySchema = z.object({
  schoolId: z.string().default("njtech"),
});

/**
 * GET /api/jwc-news?schoolId=<schoolId>
 *
 * 教务通知按学校隔离，默认读取 njtech。
 * 数据由 /api/fetch/all 写入 SQLite，不再依赖 timetable/_out 文件。
 */
export async function GET(request: Request) {
  if (!isTrustedOrigin(request, { allowInternalToken: true })) {
    return forbiddenResponse();
  }

  try {
    const { searchParams } = new URL(request.url);
    const parse = jwcNewsQuerySchema.safeParse(Object.fromEntries(searchParams));
    if (!parse.success) {
      return NextResponse.json({ error: "invalid query", issues: parse.error.issues }, { status: 400 });
    }
    const { schoolId } = parse.data;
    const db = getServerDB();
    const news = db.readData(`jwc-news:${schoolId}`) || [];
    return NextResponse.json(news);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
