
import { NextResponse } from "next/server";
import { z } from "zod";

import { resolveAccountPrefix } from "@/lib/account-prefix";
import { forbiddenResponse, isTrustedOrigin } from "@/lib/auth/origin";
// eslint-disable-next-line import/order
import { buildNoteTree, listNotePaths } from "@/lib/notes/store";
import { getServerDB } from "@/lib/server-db";

const notesTreeQuerySchema = z.object({
  schoolId: z.string().optional(),
  userId: z.string().optional(),
});

/**
 * GET /api/notes/tree?schoolId=<schoolId>&userId=<userId>
 *
 * 返回笔记目录树
 */
export async function GET(request: Request) {
  if (!isTrustedOrigin(request, { allowInternalToken: true })) {
    return forbiddenResponse();
  }

  try {
    const { searchParams } = new URL(request.url);
    const parse = notesTreeQuerySchema.safeParse(Object.fromEntries(searchParams));
    if (!parse.success) {
      return NextResponse.json({ error: "invalid query", issues: parse.error.issues }, { status: 400 });
    }
    const { schoolId, userId } = parse.data;
    const db = getServerDB();
    const active = db.findActiveCredentials();
    const prefix = resolveAccountPrefix({ schoolId, userId }, active);

    const paths = listNotePaths(prefix);
    const tree = buildNoteTree(paths);

    return NextResponse.json(tree);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
