import { getServerDB } from "@/lib/server-db";

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
  const pattern = `note-pin:${prefix}:`;
  return db.listKeys()
    .filter((k) => k.startsWith(pattern))
    .map((k) => k.slice(pattern.length));
}
