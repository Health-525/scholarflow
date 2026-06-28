import { NextResponse } from "next/server";
import { z } from "zod";

import { getAuthorizedPrefix } from "@/lib/auth/account-access";
import { forbiddenResponse, isTrustedOrigin } from "@/lib/auth/origin";
import { getTags, listAllTags, setTags } from "@/lib/notes/tags";
import { getServerDB } from "@/lib/server-db";

const tagQuerySchema = z.object({
  path: z.string().optional(),
  schoolId: z.string().optional(),
  userId: z.string().optional(),
});

const tagBodySchema = z.object({
  path: z.string().min(1),
  tags: z.array(z.string()),
  schoolId: z.string().optional(),
  userId: z.string().optional(),
});

export async function GET(request: Request) {
  if (!isTrustedOrigin(request, { allowInternalToken: true })) {
    return forbiddenResponse();
  }
  try {
    const { searchParams } = new URL(request.url);
    const parse = tagQuerySchema.safeParse(Object.fromEntries(searchParams));
    if (!parse.success) {
      return NextResponse.json({ error: "invalid query" }, { status: 400 });
    }
    const { path, schoolId, userId } = parse.data;
    const prefix = getAuthorizedPrefix(schoolId, userId, getServerDB());

    if (path) {
      return NextResponse.json({ tags: getTags(prefix, path) });
    }
    return NextResponse.json({ tags: listAllTags(prefix) });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    if (message === "unauthorized account access") {
      return forbiddenResponse({ error: message });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isTrustedOrigin(request, { allowInternalToken: true })) {
    return forbiddenResponse();
  }
  try {
    const parse = tagBodySchema.safeParse(await request.json());
    if (!parse.success) {
      return NextResponse.json({ error: "invalid input" }, { status: 400 });
    }
    const { path, tags, schoolId, userId } = parse.data;
    const prefix = getAuthorizedPrefix(schoolId, userId, getServerDB());
    setTags(prefix, path, tags);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    if (message === "unauthorized account access") {
      return forbiddenResponse({ error: message });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
