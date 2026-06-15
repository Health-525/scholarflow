import { NextResponse } from "next/server";
import { getServerDB } from "@/lib/server-db";
import { getAdapter } from "@/lib/schools/registry";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { schoolId?: string; cookie?: string };
    const { schoolId, cookie } = body;

    if (!schoolId || !cookie) {
      return NextResponse.json({ error: "missing schoolId or cookie" }, { status: 400 });
    }

    const adapter = getAdapter(schoolId);
    if (!adapter) {
      return NextResponse.json({ error: `unknown school: ${schoolId}` }, { status: 400 });
    }

    const credentials = { schoolId, data: { cookie }, expiresAt: Date.now() + 30 * 60 * 1000 };
    const exams = await adapter.fetchExams(credentials);

    const db = getServerDB();
    db.writeData("exams", exams);

    return NextResponse.json({ ok: true, count: exams.length });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
