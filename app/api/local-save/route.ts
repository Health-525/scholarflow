import { NextResponse } from "next/server";

import { getServerDB } from "@/lib/server-db";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { file?: string; content?: string; action?: string; schoolId?: string; userId?: string };
    const { file, content, action, schoolId, userId } = body;

    // Special action: view data history (from SQLite timestamps)
    if (action === "view-history" && !file) {
      const db = getServerDB();
      const keys = db.listKeys();
      const history = keys.map(key => {
        const updatedAt = db.getUpdatedAt(key);
        return `${key} — ${updatedAt ? new Date(updatedAt).toISOString() : "unknown"}`;
      });
      return NextResponse.json({ ok: true, history: history.join("\n") });
    }

    if (!file || !content) {
      return NextResponse.json({ error: "missing file/content" }, { status: 400 });
    }

    // Prefix key with schoolId:userId for account isolation
    const prefix = schoolId && userId ? `${schoolId}:${userId}` : "njtech:default";

    const db = getServerDB();

    // Special-case report markdown files to match local-data read keys
    const dailyMatch = file.match(/^日报\/(.+)\.md$/);
    if (dailyMatch) {
      const date = dailyMatch[1];
      db.writeData(`dailyReport:${prefix}:${date}`, content);
      return NextResponse.json({ ok: true });
    }

    const weeklyMatch = file.match(/^周报\/(.+)\.md$/);
    if (weeklyMatch) {
      const slug = weeklyMatch[1];
      db.writeData(`weeklyReport:${prefix}:${slug}`, content);
      return NextResponse.json({ ok: true });
    }

    // Extract key from file path: "data/schedule.json" → "schedule"
    const key = file
      .replace(/^data\//, "")
      .replace(/^_out\//, "")
      .replace(/\.json$/, "");

    const fullKey = `${key}:${prefix}`;

    // Parse content if it's JSON string, store as parsed object
    let data: unknown;
    try {
      data = JSON.parse(content);
    } catch {
      data = content; // Store as raw string if not JSON
    }

    db.writeData(fullKey, data);

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
