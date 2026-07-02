
import { NextResponse } from "next/server";
import { z } from "zod";

import { getAuthorizedAccount } from "@/lib/auth/account-access";
import { forbiddenResponse, isTrustedOrigin } from "@/lib/auth/origin";
import { listPinned } from "@/lib/notes/pin";
// eslint-disable-next-line import/order
import { buildNoteTree, getNoteUpdatedAtForPaths, listNotePaths } from "@/lib/notes/store";
import { getTagsForPaths } from "@/lib/notes/tags";
import { getServerDB } from "@/lib/server-db";
import type { NoteTreeNode } from "@/types";

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
    const account = getAuthorizedAccount({ schoolId, userId }, db);
    if (!account) {
      return forbiddenResponse({ error: "unauthorized account access" });
    }
    const prefix = `${account.schoolId}:${account.userId}`;

    const paths = listNotePaths(prefix);
    const updatedAtMap = new Map(
      getNoteUpdatedAtForPaths(prefix, paths).entries().map(([p, v]) => [p, v ?? 0])
    );
    const pinnedPaths = new Set(listPinned(prefix));
    const tagsMap = getTagsForPaths(prefix, paths);
    const tree = buildNoteTree(paths, updatedAtMap);

    function enrichTree(nodes: NoteTreeNode[]): NoteTreeNode[] {
      return nodes.map((node) => ({
        ...node,
        pinned: node.type === "file" ? pinnedPaths.has(node.path) : undefined,
        tags: node.type === "file" ? tagsMap.get(node.path) : undefined,
        children: node.children ? enrichTree(node.children) : undefined,
      }));
    }

    return NextResponse.json(enrichTree(tree));
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
