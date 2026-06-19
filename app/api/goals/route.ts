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
import { z } from "zod";

import { resolveAccountPrefix } from "@/lib/account-prefix";
import { forbiddenResponse, isTrustedOrigin } from "@/lib/auth/origin";
import { getServerDB } from "@/lib/server-db";

const dailyGoalSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  done: z.boolean(),
});

const goalsStateSchema = z.object({
  goals: z.array(dailyGoalSchema),
  streak: z.number().int().min(0),
  date: z.string(),
});

const historyRecordSchema = z.object({
  date: z.string(),
  completed: z.number().int().min(0),
  total: z.number().int().min(0),
});

const goalsPostBodySchema = z.object({
  schoolId: z.string().optional(),
  userId: z.string().optional(),
  state: goalsStateSchema.optional(),
  history: z.array(historyRecordSchema).optional(),
});

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
  if (!isTrustedOrigin(request, { allowInternalToken: true })) {
    return forbiddenResponse();
  }


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
  if (!isTrustedOrigin(request, { allowInternalToken: true })) {
    return forbiddenResponse();
  }


  try {
    const parse = goalsPostBodySchema.safeParse(await request.json());
    if (!parse.success) {
      return NextResponse.json({ error: "invalid input", issues: parse.error.issues }, { status: 400 });
    }
    const body = parse.data;

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
