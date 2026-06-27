import fs from "fs";

import { NextResponse } from "next/server";
import { z } from "zod";

import { getAuthorizedAccount } from "@/lib/auth/account-access";
import { forbiddenResponse, isTrustedOrigin } from "@/lib/auth/origin";
import { readNoteAsset, resolveNoteAssetsDir, saveNoteAsset } from "@/lib/notes/assets";
import { getServerDB } from "@/lib/server-db";

const assetQuerySchema = z.object({
  path: z.string().min(1).refine((p) => !p.includes("..") && !p.startsWith("/"), {
    message: "invalid path",
  }),
  schoolId: z.string().optional(),
  userId: z.string().optional(),
});

/**
 * GET /api/notes/assets?path=<assetName>&schoolId=<schoolId>&userId=<userId>
 *
 * 读取笔记图片资源。
 */
export async function GET(request: Request) {
  if (!isTrustedOrigin(request, { allowInternalToken: true })) {
    return forbiddenResponse();
  }

  try {
    const { searchParams } = new URL(request.url);
    const parse = assetQuerySchema.safeParse(Object.fromEntries(searchParams));
    if (!parse.success) {
      return NextResponse.json({ error: "invalid query", issues: parse.error.issues }, { status: 400 });
    }
    const { path: assetName, schoolId, userId } = parse.data;

    const db = getServerDB();
    const account = getAuthorizedAccount({ schoolId, userId }, db);
    if (!account) {
      return forbiddenResponse({ error: "unauthorized account access" });
    }

    const prefix = `${account.schoolId}:${account.userId}`;
    const asset = readNoteAsset(prefix, assetName);
    if (!asset) {
      return NextResponse.json({ error: "asset not found" }, { status: 404 });
    }

    return new NextResponse(new Blob([asset.data as BlobPart], { type: asset.contentType }), {
      headers: {
        "Content-Type": asset.contentType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/notes/assets
 *
 * 上传笔记图片资源，返回可嵌入编辑器的图片 URL。
 */
export async function POST(request: Request) {
  if (!isTrustedOrigin(request, { allowInternalToken: true })) {
    return forbiddenResponse();
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const schoolId = (formData.get("schoolId") as string | null) || undefined;
    const userId = (formData.get("userId") as string | null) || undefined;

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: "missing file" }, { status: 400 });
    }

    // 简单校验：只允许常见图片类型
    const allowedTypes = new Set([
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/gif",
      "image/webp",
      "image/svg+xml",
      "image/bmp",
    ]);
    if (!allowedTypes.has(file.type)) {
      return NextResponse.json({ error: "unsupported file type" }, { status: 400 });
    }

    const db = getServerDB();
    const account = getAuthorizedAccount({ schoolId, userId }, db);
    if (!account) {
      return forbiddenResponse({ error: "unauthorized account access" });
    }

    const prefix = `${account.schoolId}:${account.userId}`;
    const originalName = (file as File).name || "image";
    const buffer = Buffer.from(await file.arrayBuffer());
    const assetName = saveNoteAsset(prefix, originalName, buffer);

    const url = `/api/notes/assets?path=${encodeURIComponent(assetName)}&schoolId=${encodeURIComponent(account.schoolId)}&userId=${encodeURIComponent(account.userId)}`;

    return NextResponse.json({ url, name: assetName });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * 列出某账号下所有图片资源文件名（调试用，暂不对外）。
 */
export function listNoteAssetNames(prefix: string): string[] {
  const dir = resolveNoteAssetsDir(prefix);
  try {
    return fs.readdirSync(dir);
  } catch {
    return [];
  }
}
