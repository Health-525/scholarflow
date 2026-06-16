import { NextResponse } from "next/server";

import { getAdapter } from "@/lib/schools/registry";
import { getServerDB } from "@/lib/server-db";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { schoolId?: string; cookie?: string; username?: string };
    const { schoolId, cookie, username } = body;

    if (!schoolId || !cookie) {
      return NextResponse.json({ error: "missing schoolId or cookie" }, { status: 400 });
    }

    const adapter = getAdapter(schoolId);
    if (!adapter) {
      return NextResponse.json({ error: `unknown school: ${schoolId}` }, { status: 400 });
    }

    const credentials = { schoolId, data: { cookie, username: username || "" }, expiresAt: Date.now() + 30 * 60 * 1000 };
    const grades = await adapter.fetchGrades(credentials);

    const db = getServerDB();
    const userId = username || "default";
    const prefix = `${schoolId}:${userId}`;
    db.writeData(`grades:${prefix}`, grades);
    // Also update student info
    db.writeData(`student:${prefix}`, {
      studentId: username || "",
      gpa: grades.gpa,
      totalCredits: grades.totalCredits,
      courseCount: grades.allCourses.length,
    });

    return NextResponse.json({ ok: true, gpa: grades.gpa, courses: grades.allCourses.length });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
