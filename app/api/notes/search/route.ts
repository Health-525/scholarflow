import { NextResponse } from "next/server";
import { z } from "zod";

import { getAuthorizedPrefix } from "@/lib/auth/account-access";
import { forbiddenResponse, isTrustedOrigin } from "@/lib/auth/origin";
import { searchNotes } from "@/lib/notes/search";
import { getNoteUpdatedAt } from "@/lib/notes/store";
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
    const prefix = getAuthorizedPrefix(schoolId, userId, db);

    const results = searchNotes(prefix, q);

    const keyPrefix = `note:${prefix}:`;
    const items: NoteSearchResult[] = results.map((r) => {
      const relativePath = r.key.startsWith(keyPrefix)
        ? r.key.slice(keyPrefix.length)
        : r.key;
      return {
        path: relativePath,
        title: relativePath.replace(/\.md$/i, "").replace(/[-_]/g, " "),
        snippet: r.snippet,
        updatedAt: getNoteUpdatedAt(prefix, relativePath) ?? r.rank,
        rank: r.rank,
      };
    });

    return NextResponse.json({ results: items });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    if (message === "unauthorized account access") {
      return forbiddenResponse({ error: message });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
