import { NextResponse } from "next/server";
import { z } from "zod";

import { getAuthorizedAccount } from "@/lib/auth/account-access";
import { forbiddenResponse, isTrustedOrigin } from "@/lib/auth/origin";
import { getServerDB } from "@/lib/server-db";

const localSaveBodySchema = z.object({
  file: z.string().min(1).optional(),
  content: z.string().optional(),
  action: z.string().optional(),
  schoolId: z.string().optional(),
  userId: z.string().optional(),
});

/** 禁止通过 local-save 写入的敏感 key 前缀/模式 */
const SENSITIVE_KEY_PATTERNS = [
  /^credential-/,
  /^secure-/,
  /password/i,
];

/** 允许通过 local-save 写入的业务 key 白名单 */
const ALLOWED_DATA_KEYS = new Set([
  "schedule",
  "assignments",
  "exams",
  "goals",
  "adjustments",
  "dailyReport",
  "weeklyReport",
  "grades",
  "ai-config",
  "appOverrides",
]);

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

function isAllowedDataKey(key: string): boolean {
  return ALLOWED_DATA_KEYS.has(key);
}

export async function POST(request: Request) {
  try {
    if (!isTrustedOrigin(request, { allowInternalToken: true })) {
      return forbiddenResponse();
    }

    const parse = localSaveBodySchema.safeParse(await request.json());
    if (!parse.success) {
      return NextResponse.json({ error: "invalid input", issues: parse.error.issues }, { status: 400 });
    }
    const { file, content, action, schoolId, userId } = parse.data;

    if (!file && action !== "view-history") {
      return NextResponse.json({ error: "missing file/action" }, { status: 400 });
    }

    const db = getServerDB();

    // Prefix key with schoolId:userId for account isolation
    const account = getAuthorizedAccount({ schoolId, userId }, db);
    if (!account) {
      return forbiddenResponse({ error: "unauthorized account access" });
    }
    const prefix = `${account.schoolId}:${account.userId}`;

    // Special action: view data history (from SQLite timestamps), scoped to current account
    if (action === "view-history" && !file) {
      const keys = db.listKeys().filter((key) => key.endsWith(`:${prefix}`));
      const history = keys.map(key => {
        const updatedAt = db.getUpdatedAt(key);
        return `${key} — ${updatedAt ? new Date(updatedAt).toISOString() : "unknown"}`;
      });
      return NextResponse.json({ ok: true, history: history.join("\n") });
    }

    if (!file) {
      return NextResponse.json({ error: "missing file" }, { status: 400 });
    }
    if (content === undefined || content === null) {
      return NextResponse.json({ error: "missing content" }, { status: 400 });
    }

    // Special-case report markdown files to match local-data read keys
    const dailyMatch = file.match(/^日报\/(.+)\.md$/);
    if (dailyMatch) {
      const date = dailyMatch[1];
      db.writeData(`dailyReport:${prefix}:${date}`, { content, updatedAt: Date.now() });
      return NextResponse.json({ ok: true });
    }

    const weeklyMatch = file.match(/^周报\/(.+)\.md$/);
    if (weeklyMatch) {
      const slug = weeklyMatch[1];
      db.writeData(`weeklyReport:${prefix}:${slug}`, { content, updatedAt: Date.now() });
      return NextResponse.json({ ok: true });
    }

    // Extract key from file path: "data/schedule.json" → "schedule"
    const key = file
      .replace(/^data\//, "")
      .replace(/^_out\//, "")
      .replace(/\.json$/, "");

    if (isSensitiveKey(key)) {
      return NextResponse.json({ error: "forbidden key" }, { status: 403 });
    }
    if (!isAllowedDataKey(key)) {
      return NextResponse.json({ error: "disallowed key" }, { status: 403 });
    }

    const fullKey = `${key}:${prefix}`;

    // Parse content if it's JSON string, store as parsed object
    let data: unknown;
    try {
      data = JSON.parse(content);
    } catch {
      data = content; // Store as raw string if not JSON
    }

    db.writeData(fullKey, data);

    // 作业/课表/成绩变更后，清除仪表盘当天缓存，下次请求时重新计算
    if (["assignments", "schedule", "grades"].includes(key)) {
      db.deleteData(`dashboard-summary:${prefix}`);
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
