import { NextResponse } from "next/server";

import { resolveAccountPrefix } from "@/lib/account-prefix";
// eslint-disable-next-line import/order
import { buildNoteTree, listNotePaths } from "@/lib/notes/store";
import { getServerDB } from "@/lib/server-db";

/**
 * GET /api/notes/tree?schoolId=<schoolId>&userId=<userId>
 *
 * 返回笔记目录树
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get("schoolId");
    const userId = searchParams.get("userId");
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
