
import { NextResponse } from "next/server";
import { z } from "zod";

import { resolveAccountPrefix } from "@/lib/account-prefix";
import { forbiddenResponse, isTrustedOrigin } from "@/lib/auth/origin";
import { getServerDB } from "@/lib/server-db";
// eslint-disable-next-line import/order
import { deleteNote, readNote, renameNote, writeNote } from "@/lib/notes/store";

const notesQuerySchema = z.object({
  path: z.string().min(1),
  schoolId: z.string().optional(),
  userId: z.string().optional(),
});

const notesActionBodySchema = z.object({
  action: z.enum(["save", "create", "delete", "rename"]),
  path: z.string().min(1),
  content: z.string().optional(),
  newPath: z.string().min(1).optional(),
  schoolId: z.string().optional(),
  userId: z.string().optional(),
});

function getNotePrefix(schoolId?: string | null, userId?: string | null): string {
  const db = getServerDB();
  const active = db.findActiveCredentials();
  return resolveAccountPrefix({ schoolId, userId }, active);
}

/**
 * GET /api/notes?path=<path>&schoolId=<schoolId>&userId=<userId>
 *
 * 读取单篇笔记内容
 */
export async function GET(request: Request) {
  if (!isTrustedOrigin(request, { allowInternalToken: true })) {
    return forbiddenResponse();
  }

  try {
    const { searchParams } = new URL(request.url);
    const parse = notesQuerySchema.safeParse(Object.fromEntries(searchParams));
    if (!parse.success) {
      return NextResponse.json({ error: "invalid query", issues: parse.error.issues }, { status: 400 });
    }
    const { path, schoolId, userId } = parse.data;

    const prefix = getNotePrefix(schoolId, userId);
    const content = readNote(prefix, path);

    if (content === null) {
      return NextResponse.json({ error: "note not found" }, { status: 404 });
    }

    return NextResponse.json({ path, content });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/notes
 *
 * 笔记写操作：保存、创建、删除、重命名
 */
export async function POST(request: Request) {
  if (!isTrustedOrigin(request, { allowInternalToken: true })) {
    return forbiddenResponse();
  }


  try {
    const parse = notesActionBodySchema.safeParse(await request.json());
    if (!parse.success) {
      return NextResponse.json({ error: "invalid input", issues: parse.error.issues }, { status: 400 });
    }
    const body = parse.data;
    const { action, path, schoolId, userId } = body;
    const prefix = getNotePrefix(schoolId, userId);

    switch (action) {
      case "save": {
        if (body.content === undefined) {
          return NextResponse.json({ error: "missing content" }, { status: 400 });
        }
        writeNote(prefix, path, body.content);
        return NextResponse.json({ ok: true });
      }

      case "create": {
        if (readNote(prefix, path) !== null) {
          return NextResponse.json({ error: "note already exists" }, { status: 409 });
        }
        writeNote(prefix, path, body.content || "");
        return NextResponse.json({ ok: true, path });
      }

      case "delete": {
        const deleted = deleteNote(prefix, path);
        if (!deleted) {
          return NextResponse.json({ error: "note not found" }, { status: 404 });
        }
        return NextResponse.json({ ok: true });
      }

      case "rename": {
        if (!body.newPath) {
          return NextResponse.json({ error: "missing newPath" }, { status: 400 });
        }
        if (readNote(prefix, body.newPath) !== null) {
          return NextResponse.json({ error: "target already exists" }, { status: 409 });
        }
        const renamed = renameNote(prefix, path, body.newPath);
        if (!renamed) {
          return NextResponse.json({ error: "note not found" }, { status: 404 });
        }
        return NextResponse.json({ ok: true, path: body.newPath });
      }

      default:
        return NextResponse.json({ error: "unknown action" }, { status: 400 });
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
