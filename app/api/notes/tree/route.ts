import { NextResponse } from "next/server";

import { buildNoteTree, listNotePaths } from "@/lib/notes/store";

/**
 * GET /api/notes/tree?schoolId=<schoolId>&userId=<userId>
 *
 * 返回笔记目录树
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get("schoolId") || "njtech";
    const userId = searchParams.get("userId") || "default";
    const prefix = `${schoolId}:${userId}`;

    const paths = listNotePaths(prefix);
    const tree = buildNoteTree(paths);

    return NextResponse.json(tree);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
