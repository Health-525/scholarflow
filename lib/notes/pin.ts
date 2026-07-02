import { getServerDB } from "@/lib/server-db";
import { escapeLike } from "@/lib/server-db/utils";

function pinKey(prefix: string, notePath: string): string {
  return `note-pin:${prefix}:${notePath}`;
}

export function isPinned(prefix: string, notePath: string): boolean {
  const db = getServerDB();
  return db.readData(pinKey(prefix, notePath)) === true;
}

export function setPinned(prefix: string, notePath: string, pinned: boolean): void {
  const db = getServerDB();
  if (pinned) {
    db.writeData(pinKey(prefix, notePath), true);
  } else {
    db.deleteData(pinKey(prefix, notePath));
  }
}

export function listPinned(prefix: string): string[] {
  const db = getServerDB();
  const pattern = `note-pin:${escapeLike(prefix)}:%`;
  const rows = db
    .getRawDB()
    .prepare(`SELECT key FROM data_store WHERE key LIKE ? ESCAPE '\\'`)
    .all(pattern) as { key: string }[];
  const patternLen = `note-pin:${prefix}:`.length;
  return rows.map((r) => r.key.slice(patternLen));
}
