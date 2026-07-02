import { NextResponse } from "next/server";

import {
  clearActivityData,
  cleanupOldSegments,
  closeOpenSegment,
  insertSegment,
  queryDaySummary,
  type ActivitySegment,
} from "@/lib/activity/db";
import { forbiddenResponse, isTrustedOrigin } from "@/lib/auth/origin";
import { logger } from "@/lib/logger";

function parseLocalDayBounds(dateStr: string): { startMs: number; endMs: number } {
  const [y, m, d] = dateStr.split("-").map((n) => parseInt(n, 10));
  if ([y, m, d].some((n) => Number.isNaN(n))) {
    throw new Error(`Invalid date string: ${dateStr}`);
  }
  const start = new Date(y, m - 1, d, 0, 0, 0, 0);
  const end = new Date(y, m - 1, d + 1, 0, 0, 0, 0);
  return { startMs: start.getTime(), endMs: end.getTime() };
}

function isValidSegmentType(value: unknown): value is ActivitySegment["type"] {
  return value === "app" || value === "idle" || value === "away";
}

/**
 * POST /api/internal/activity?action=...
 * GET  /api/internal/activity?action=...
 *
 * 屏幕时间内部 API，仅供 Electron 主进程在开发模式 ABI 不兼容时通过 HTTP 调用。
 * 必须携带正确的内部 token 或来自受信任来源。
 */
export async function POST(request: Request) {
  if (!isTrustedOrigin(request, { allowInternalToken: true })) {
    return forbiddenResponse();
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  try {
    switch (action) {
      case "insert": {
        const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
        if (!isValidSegmentType(body.type)) {
          return NextResponse.json({ error: "invalid segment type" }, { status: 400 });
        }
        const seg: ActivitySegment = {
          type: body.type,
          app: body.app != null ? String(body.app) : null,
          title: body.title != null ? String(body.title) : null,
          domain: body.domain != null ? String(body.domain) : null,
          category: body.category != null ? String(body.category) : null,
          project: body.project != null ? String(body.project) : null,
          beginAt: Number(body.beginAt),
          endAt: body.endAt != null ? Number(body.endAt) : null,
        };
        if (Number.isNaN(seg.beginAt)) {
          return NextResponse.json({ error: "invalid beginAt" }, { status: 400 });
        }
        const id = insertSegment(seg);
        return NextResponse.json({ ok: true, id });
      }

      case "close-open": {
        const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
        const endAt = Number(body.endAt);
        if (Number.isNaN(endAt)) {
          return NextResponse.json({ error: "invalid endAt" }, { status: 400 });
        }
        closeOpenSegment(endAt);
        return NextResponse.json({ ok: true });
      }

      case "clear": {
        clearActivityData();
        return NextResponse.json({ ok: true });
      }

      case "cleanup": {
        const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
        const retentionDays = Number(body.retentionDays);
        if (Number.isNaN(retentionDays) || retentionDays <= 0) {
          return NextResponse.json({ error: "invalid retentionDays" }, { status: 400 });
        }
        const deleted = cleanupOldSegments(retentionDays);
        return NextResponse.json({ ok: true, deleted });
      }

      default:
        return NextResponse.json({ error: `unknown action: ${action}` }, { status: 400 });
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    logger.error("[/api/internal/activity] POST error:", (err as Error)?.message ?? err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  if (!isTrustedOrigin(request, { allowInternalToken: true })) {
    return forbiddenResponse();
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  try {
    switch (action) {
      case "query-day": {
        const date = searchParams.get("date");
        if (!date) {
          return NextResponse.json({ error: "missing date" }, { status: 400 });
        }
        // validate date format
        parseLocalDayBounds(date);
        const summary = queryDaySummary(date, Date.now());
        return NextResponse.json(summary);
      }

      case "query-range": {
        const start = searchParams.get("start");
        const end = searchParams.get("end");
        if (!start || !end) {
          return NextResponse.json({ error: "missing start or end" }, { status: 400 });
        }
        const { startMs } = parseLocalDayBounds(start);
        const { endMs } = parseLocalDayBounds(end);
        const days: Array<{
          date: string;
          totalMinutes: number;
          idleMinutes: number;
          awayMinutes: number;
        }> = [];
        const DAY_MS = 24 * 60 * 60 * 1000;
        for (let t = startMs; t < endMs; t += DAY_MS) {
          const d = new Date(t);
          const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          const summary = queryDaySummary(dateStr, Date.now());
          days.push({
            date: dateStr,
            totalMinutes: summary.totalMinutes,
            idleMinutes: summary.idleMinutes,
            awayMinutes: summary.awayMinutes,
          });
        }
        return NextResponse.json(days);
      }

      default:
        return NextResponse.json({ error: `unknown action: ${action}` }, { status: 400 });
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    logger.error("[/api/internal/activity] GET error:", (err as Error)?.message ?? err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
