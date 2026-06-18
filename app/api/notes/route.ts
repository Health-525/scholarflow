import { NextResponse } from "next/server";

import { resolveAccountPrefix } from "@/lib/account-prefix";
import { getServerDB } from "@/lib/server-db";
// eslint-disable-next-line import/order
import { deleteNote, readNote, renameNote, writeNote } from "@/lib/notes/store";

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
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get("path");
    const schoolId = searchParams.get("schoolId");
    const userId = searchParams.get("userId");

    if (!path) {
      return NextResponse.json({ error: "missing path" }, { status: 400 });
    }

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

interface NotesActionBody {
  action: "save" | "create" | "delete" | "rename";
  path: string;
  content?: string;
  newPath?: string;
  schoolId?: string;
  userId?: string;
}

/**
 * POST /api/notes
 *
 * 笔记写操作：保存、创建、删除、重命名
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as NotesActionBody;
    const { action, path, schoolId, userId } = body;
    const prefix = getNotePrefix(schoolId, userId);

    if (!path) {
      return NextResponse.json({ error: "missing path" }, { status: 400 });
    }

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
