import { NextResponse } from "next/server";
import { getServerDB } from "@/lib/server-db";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { file?: string; content?: string; action?: string };
    const { file, content, action } = body;

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

    // Extract key from file path: "data/schedule.json" → "schedule"
    const key = file
      .replace(/^data\//, "")
      .replace(/^_out\//, "")
      .replace(/\.json$/, "");

    const db = getServerDB();

    // Parse content if it's JSON string, store as parsed object
    let data: unknown;
    try {
      data = JSON.parse(content);
    } catch {
      data = content; // Store as raw string if not JSON
    }

    db.writeData(key, data);

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
