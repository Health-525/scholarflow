import { NextResponse } from "next/server";

import { getAuthorizedAccount, getAuthorizedSchoolId } from "@/lib/auth/account-access";
import { forbiddenResponse, isTrustedOrigin } from "@/lib/auth/origin";
import { getServerDB } from "@/lib/server-db";

interface WeeklyReportRecord {
  content?: string;
  theme?: string;
  generatedAt?: number;
  ai?: boolean;
}

/**
 * PUT /api/reports/weekly/<slug>?schoolId=...&userId=...
 *
 * 更新已有周报的正文与主题，用于用户手动编辑后保存。
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!isTrustedOrigin(request, { allowInternalToken: true })) {
    return forbiddenResponse();
  }

  try {
    const db = getServerDB();
    const { searchParams } = new URL(request.url);
    const schoolIdParam = searchParams.get("schoolId") || undefined;
    const userIdParam = searchParams.get("userId") || undefined;

    const account = getAuthorizedAccount({ schoolId: schoolIdParam, userId: userIdParam }, db);
    const schoolId = getAuthorizedSchoolId(schoolIdParam, db);

    if (!account || !schoolId) {
      return forbiddenResponse({ error: "unauthorized account access" });
    }

    const { slug } = await params;
    const prefix = `${account.schoolId}:${account.userId}`;
    const key = `weeklyReport:${prefix}:${slug}`;
    const existing = db.readData(key) as WeeklyReportRecord | null;
    if (!existing) {
      return NextResponse.json({ error: "report not found" }, { status: 404 });
    }

    const body = (await request.json().catch(() => ({}))) as { content?: string; theme?: string };
    if (typeof body.content !== "string" || body.content.trim() === "") {
      return NextResponse.json({ error: "content is required" }, { status: 400 });
    }

    db.writeData(key, {
      ...existing,
      content: body.content,
      theme: typeof body.theme === "string" ? body.theme : existing.theme,
      generatedAt: Date.now(),
    });

    return NextResponse.json({ ok: true, slug });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[/api/reports/weekly/:slug] error:", (err as Error)?.message ?? err);
    return NextResponse.json({ error: "failed to update weekly report" }, { status: 500 });
  }
}
