import { NextResponse } from "next/server";
import { z } from "zod";

import { getAuthorizedAccount } from "@/lib/auth/account-access";
import { forbiddenResponse, isTrustedOrigin } from "@/lib/auth/origin";
import { getHistory } from "@/lib/notes/history";
import { getServerDB } from "@/lib/server-db";

const historyQuerySchema = z.object({
  path: z.string().min(1).refine((p) => !p.includes("..") && !p.startsWith("/"), {
    message: "invalid path",
  }),
  schoolId: z.string().optional(),
  userId: z.string().optional(),
});

function getPrefix(schoolId?: string | null, userId?: string | null): string {
  const db = getServerDB();
  const account = getAuthorizedAccount({ schoolId, userId }, db);
  if (!account) throw new Error("unauthorized account access");
  return `${account.schoolId}:${account.userId}`;
}

export async function GET(request: Request) {
  if (!isTrustedOrigin(request, { allowInternalToken: true })) {
    return forbiddenResponse();
  }
  try {
    const { searchParams } = new URL(request.url);
    const parse = historyQuerySchema.safeParse(Object.fromEntries(searchParams));
    if (!parse.success) {
      return NextResponse.json({ error: "invalid query" }, { status: 400 });
    }
    const { path, schoolId, userId } = parse.data;
    const prefix = getPrefix(schoolId, userId);
    const history = getHistory(prefix, path);
    return NextResponse.json({ history });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    if (message === "unauthorized account access") {
      return forbiddenResponse({ error: message });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
