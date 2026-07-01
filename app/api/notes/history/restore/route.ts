import { NextResponse } from "next/server";
import { z } from "zod";

import { getAuthorizedPrefix } from "@/lib/auth/account-access";
import { forbiddenResponse, isTrustedOrigin } from "@/lib/auth/origin";
import { getVersion } from "@/lib/notes/history";
import { writeNote } from "@/lib/notes/store";
import { getServerDB } from "@/lib/server-db";

const restoreBodySchema = z.object({
  path: z.string().min(1).refine((p) => !p.includes("..") && !p.startsWith("/"), {
    message: "invalid path",
  }),
  versionIndex: z.number().int().min(0),
  schoolId: z.string().optional(),
  userId: z.string().optional(),
});

export async function POST(request: Request) {
  if (!isTrustedOrigin(request, { allowInternalToken: true })) {
    return forbiddenResponse();
  }
  try {
    const parse = restoreBodySchema.safeParse(await request.json());
    if (!parse.success) {
      return NextResponse.json({ error: "invalid input" }, { status: 400 });
    }
    const { path, versionIndex, schoolId, userId } = parse.data;
    const prefix = getAuthorizedPrefix(schoolId, userId, getServerDB());
    const version = getVersion(prefix, path, versionIndex);
    if (!version) {
      return NextResponse.json({ error: "version not found" }, { status: 404 });
    }
    writeNote(prefix, path, version.content);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    if (message === "unauthorized account access") {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
