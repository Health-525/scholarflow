import { NextResponse } from "next/server";
import { z } from "zod";

import { resolveAccountPrefix } from "@/lib/account-prefix";
import { forbiddenResponse, isTrustedOrigin } from "@/lib/auth/origin";
import { searchNotes } from "@/lib/notes/search";
import { getServerDB } from "@/lib/server-db";
import type { NoteSearchResult } from "@/types";

const searchQuerySchema = z.object({
  q: z.string().min(1).max(200),
  schoolId: z.string().optional(),
  userId: z.string().optional(),
});

export async function GET(request: Request) {
  if (!isTrustedOrigin(request, { allowInternalToken: true })) {
    return forbiddenResponse();
  }

  try {
    const { searchParams } = new URL(request.url);
    const parse = searchQuerySchema.safeParse(Object.fromEntries(searchParams));
    if (!parse.success) {
      return NextResponse.json({ error: "invalid query" }, { status: 400 });
    }
    const { q, schoolId, userId } = parse.data;
    const db = getServerDB();
    const active = db.findActiveCredentials();
    const prefix = resolveAccountPrefix({ schoolId, userId }, active);

    const results = searchNotes(prefix, q);

    const items: NoteSearchResult[] = results.map((r) => ({
      path: r.key.replace(`note:${prefix}:`, ""),
      title: r.key.replace(`note:${prefix}:`, "").replace(/\.md$/i, "").replace(/[-_]/g, " "),
      snippet: r.snippet,
      updatedAt: 0,
      rank: r.rank,
    }));

    return NextResponse.json({ results: items });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
