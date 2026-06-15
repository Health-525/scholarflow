import { NextResponse } from "next/server";
import { getServerDB } from "@/lib/server-db";

/**
 * GET /api/auth/session
 * 获取当前登录状态
 */
export async function GET() {
  try {
    const db = getServerDB();

    // 查找最近的凭证
    const keys = db.listKeys();
    // Check if we have credentials stored
    // For now, check if schedule data exists (indicates a logged-in user)
    const hasData = keys.includes("schedule");

    return NextResponse.json({
      authenticated: hasData,
      schoolId: hasData ? "njtech" : null,
    });
  } catch {
    return NextResponse.json({ authenticated: false, schoolId: null });
  }
}
