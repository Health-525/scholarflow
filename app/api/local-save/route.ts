import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// 复用 local-data 的时间表目录探测
function findTimetableDir(): string {
  const envDir = process.env.TIMETABLE_DIR;
  if (envDir) try { if (fs.existsSync(path.join(envDir, "data"))) return envDir; } catch {}
  const candidates = [
    path.join(process.cwd(), "..", "timetable"),
    path.join(process.cwd(), "..", "..", "timetable"),
    path.join(process.cwd(), "..", "..", "..", "timetable"),
  ];
  for (const c of candidates) {
    try { if (fs.existsSync(path.join(c, "data"))) return c; } catch {}
  }
  throw new Error("Cannot find timetable directory");
}

export async function POST(request: Request) {
  try {
    const { file, content } = await request.json();
    if (!file || !content) return NextResponse.json({ error: "missing file/content" }, { status: 400 });

    const td = findTimetableDir();
    const filePath = path.join(td, file);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, "utf8");

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
