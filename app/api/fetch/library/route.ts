import { NextResponse } from "next/server";

import { getAdapter } from "@/lib/schools/registry";
import { getServerDB } from "@/lib/server-db";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { schoolId?: string; libraryJwt?: string };
    const { schoolId, libraryJwt } = body;

    if (!schoolId) {
      return NextResponse.json({ error: "missing schoolId" }, { status: 400 });
    }

    const adapter = getAdapter(schoolId);
    if (!adapter || !adapter.fetchLibrary) {
      return NextResponse.json({ error: "school does not support library" }, { status: 400 });
    }

    if (!libraryJwt) {
      return NextResponse.json({ error: "missing libraryJwt" }, { status: 400 });
    }

    const credentials = { schoolId, data: { libraryJwt }, expiresAt: Date.now() + 30 * 60 * 1000 };
    const library = await adapter.fetchLibrary(credentials);

    if (!library) {
      return NextResponse.json({ error: "failed to fetch library data" }, { status: 500 });
    }

    const db = getServerDB();
    db.writeData("library", library);

    return NextResponse.json({ ok: true, rooms: library.libs.length });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
