import { NextResponse } from "next/server";
import { getServerDB } from "@/lib/server-db";

/**
 * GET /api/auth/session
 * 获取当前登录状态 — 检查凭证是否存在且未过期
 */
export async function GET() {
  try {
    const db = getServerDB();

    // 直接查询 credentials 表中的有效凭证
    // getCredentials 会自动检查过期
    // 尝试常见的 schoolId/userId 组合
    const knownSchools = ["njtech"];

    for (const schoolId of knownSchools) {
      // 尝试从 data_store 中获取已知的 userId
      const studentData = db.readData("student") as Record<string, string> | null;
      const userId = studentData?.studentId || "default";

      const creds = db.getCredentials(schoolId, userId);
      if (creds) {
        return NextResponse.json({
          authenticated: true,
          schoolId,
          userId,
          username: creds.username || userId,
        });
      }
    }

    // 没有有效凭证
    return NextResponse.json({ authenticated: false, schoolId: null });
  } catch {
    return NextResponse.json({ authenticated: false, schoolId: null });
  }
}
