
import { NextResponse } from "next/server";

import { resolveUserId, buildDataKey } from "@/lib/account-prefix";
import { resolveAuthorizedAccount } from "@/lib/auth/account-access";
import { forbiddenResponse, isTrustedOrigin } from "@/lib/auth/origin";
import { mergeExams } from "@/lib/exams/merge";
import { schoolCookieBodySchema } from "@/lib/schemas/fetch";
import { getAdapter } from "@/lib/schools/registry";
import { getServerDB } from "@/lib/server-db";
import type { Exam } from "@/types/exam";

export async function POST(request: Request) {
  if (!isTrustedOrigin(request, { allowInternalToken: true })) {
    return forbiddenResponse();
  }


  try {
    const parse = schoolCookieBodySchema.safeParse(await request.json());
    if (!parse.success) {
      return NextResponse.json({ error: "invalid input", issues: parse.error.issues }, { status: 400 });
    }
    const { schoolId, cookie, username } = parse.data;

    const adapter = getAdapter(schoolId);
    if (!adapter) {
      return NextResponse.json({ error: `unknown school: ${schoolId}` }, { status: 400 });
    }

    const credentials = { schoolId, data: { cookie }, expiresAt: Date.now() + 30 * 60 * 1000 };
    const fetchedExams = await adapter.fetchExams(credentials);

    const db = getServerDB();
    const targetAccount = resolveAuthorizedAccount(request, db, { schoolId, userId: username });
    if (!targetAccount) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const userId = resolveUserId(targetAccount.userId);
    const prefix = `${targetAccount.schoolId}:${userId}`;
    const key = buildDataKey("exams", prefix);
    const existing = (db.readData(key) as Exam[]) || [];
    const merged = mergeExams(existing, fetchedExams as unknown as Exam[]);
    db.writeData(key, merged);

    return NextResponse.json({ ok: true, count: fetchedExams.length });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
