import { NextResponse } from "next/server";
import { getServerDB } from "@/lib/server-db";

/**
 * POST /api/auth/logout
 * 清除凭证和认证状态
 */
export async function POST() {
  try {
    const db = getServerDB();

    // 删除所有已知学校的凭证
    const knownSchools = ["njtech"];
    for (const schoolId of knownSchools) {
      const studentData = db.readData("student") as Record<string, string> | null;
      const userId = studentData?.studentId || "default";
      db.deleteCredentials(schoolId, userId);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
