import { NextResponse } from "next/server";

import { forbiddenResponse, isTrustedOrigin } from "@/lib/auth/origin";
import { schoolIdBodySchema } from "@/lib/schemas/fetch";
import { getAdapter } from "@/lib/schools/registry";
import { getServerDB } from "@/lib/server-db";

export async function POST(request: Request) {
  if (!isTrustedOrigin(request, { allowInternalToken: true })) {
    return forbiddenResponse();
  }


  try {
    const parse = schoolIdBodySchema.safeParse(await request.json());
    if (!parse.success) {
      return NextResponse.json({ error: "invalid input", issues: parse.error.issues }, { status: 400 });
    }
    const { schoolId } = parse.data;

    const adapter = getAdapter(schoolId);
    if (!adapter || !adapter.fetchJwcNews) {
      return NextResponse.json({ error: "school does not support jwc-news" }, { status: 400 });
    }

    // Get existing news for merge
    const db = getServerDB();
    const key = `jwc-news:${schoolId}`;
    const existing = (db.readData(key) as import("@/lib/schools/types").NewsItem[]) || [];

    const news = await adapter.fetchJwcNews(existing);
    db.writeData(key, news);

    return NextResponse.json({ ok: true, count: news.length });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
