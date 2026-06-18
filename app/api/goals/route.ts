/**
 * /api/goals — 每日目标数据读写
 *
 * GET  /api/goals?schoolId=&userId=        读取当天目标状态 + streak + 历史
 * POST /api/goals                          写入目标状态或历史
 *
 * SQLite key:
 *   goals:state:<prefix>    → { goals, streak, date }
 *   goals:history:<prefix>  → [{ date, completed, total }]
 */

import { NextResponse } from "next/server";

import { resolveAccountPrefix } from "@/lib/account-prefix";
import { getServerDB } from "@/lib/server-db";

interface DailyGoal {
  id: string;
  text: string;
  done: boolean;
}

interface GoalsState {
  goals: DailyGoal[];
  streak: number;
  date: string;  // toDateString()
}

interface HistoryRecord {
  date: string;
  completed: number;
  total: number;
}

function getPrefix(schoolId: string | null, userId: string | null) {
  const db = getServerDB();
  const active = db.findActiveCredentials();
  return resolveAccountPrefix({ schoolId, userId }, active);
}

// ── GET ─────────────────────────────────────────────────────

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const prefix = getPrefix(
      searchParams.get("schoolId"),
      searchParams.get("userId")
    );
    const db = getServerDB();

    const state = (db.readData(`goals:state:${prefix}`) ?? {
      goals: [], streak: 0, date: "",
    }) as GoalsState;

    const history = (db.readData(`goals:history:${prefix}`) ?? []) as HistoryRecord[];

    return NextResponse.json({ state, history });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[/api/goals GET]", (err as Error)?.message);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}

// ── POST ────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      schoolId?: string;
      userId?: string;
      state?: GoalsState;
      history?: HistoryRecord[];
    };

    const prefix = getPrefix(body.schoolId ?? null, body.userId ?? null);
    const db = getServerDB();

    if (body.state !== undefined) {
      db.writeData(`goals:state:${prefix}`, body.state);
    }
    if (body.history !== undefined) {
      db.writeData(`goals:history:${prefix}`, body.history);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[/api/goals POST]", (err as Error)?.message);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
