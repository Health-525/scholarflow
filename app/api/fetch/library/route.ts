
import { NextResponse } from "next/server";

import { resolveUserId, resolveAccountPrefix, buildDataKey } from "@/lib/account-prefix";
import { forbiddenResponse, isTrustedOrigin } from "@/lib/auth/origin";
import { schoolLibraryJwtBodySchema } from "@/lib/schemas/fetch";
import { getAdapter } from "@/lib/schools/registry";
import { getServerDB } from "@/lib/server-db";

export async function POST(request: Request) {
  if (!isTrustedOrigin(request, { allowInternalToken: true })) {
    return forbiddenResponse();
  }


  try {
    const parse = schoolLibraryJwtBodySchema.safeParse(await request.json());
    if (!parse.success) {
      return NextResponse.json({ error: "invalid input", issues: parse.error.issues }, { status: 400 });
    }
    const { schoolId, libraryJwt, username } = parse.data;

    const adapter = getAdapter(schoolId);
    if (!adapter || !adapter.fetchLibrary) {
      return NextResponse.json({ error: "school does not support library" }, { status: 400 });
    }

    const credentials = { schoolId, data: { libraryJwt }, expiresAt: Date.now() + 30 * 60 * 1000 };
    const library = await adapter.fetchLibrary(credentials);

    if (!library) {
      return NextResponse.json({ error: "failed to fetch library data" }, { status: 500 });
    }

    const db = getServerDB();
    const userId = resolveUserId(username);
    // username 缺失时用 active 凭证兜底,保证与 local-data 读取端落同一 key
    const prefix = username
      ? `${schoolId}:${userId}`
      : resolveAccountPrefix({ schoolId, userId: undefined }, db.findActiveCredentials());
    db.writeData(buildDataKey("library", prefix), library);

    return NextResponse.json({ ok: true, rooms: library.libs.length });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
