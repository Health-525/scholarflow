/**
 * /api/exams — 考试数据 CRUD
 *
 * GET    /api/exams?schoolId=&userId=          读取考试列表
 * POST   /api/exams                            新增一条考试
 * PATCH  /api/exams                            更新状态（完成/取消完成）
 * DELETE /api/exams?id=&schoolId=&userId=      删除一条考试
 *
 * 数据 key：user-exams:<schoolId>:<userId>
 * 存储格式：Exam[]（JSON array）
 *
 * source 字段区分来源：
 *   "manual"  — 用户手动添加，删除后彻底消失
 *   "jwgl"    — 教务系统导入，删除后进入 hiddenIds 列表，重新导入不恢复
 */

import { NextResponse } from "next/server";

import { resolveAccountPrefix } from "@/lib/account-prefix";
import { getServerDB } from "@/lib/server-db";
import type { Exam } from "@/types/exam";

function getExamKey(prefix: string) {
  return `user-exams:${prefix}`;
}

function readExams(prefix: string): Exam[] {
  const db = getServerDB();
  const raw = db.readData(getExamKey(prefix));
  if (!Array.isArray(raw)) return [];
  return raw as Exam[];
}

function writeExams(prefix: string, exams: Exam[]) {
  getServerDB().writeData(getExamKey(prefix), exams);
}

// ── GET ─────────────────────────────────────────────────────

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const db = getServerDB();
    const active = db.findActiveCredentials();
    const prefix = resolveAccountPrefix(
      { schoolId: searchParams.get("schoolId"), userId: searchParams.get("userId") },
      active
    );
    return NextResponse.json(readExams(prefix));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[/api/exams GET]", (err as Error)?.message);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}

// ── POST（新增 or 批量导入）────────────────────────────────

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      exam?: Partial<Exam>;
      exams?: Partial<Exam>[];   // 批量导入（教务同步用）
      schoolId?: string;
      userId?: string;
    };

    const db = getServerDB();
    const active = db.findActiveCredentials();
    const prefix = resolveAccountPrefix(
      { schoolId: body.schoolId, userId: body.userId },
      active
    );

    const existing = readExams(prefix);

    // 批量导入（去重）
    if (body.exams) {
      let added = 0;
      for (const raw of body.exams) {
        if (!raw.subject || !raw.date) continue;
        const isDup = existing.some(
          (e) => e.subject === raw.subject && e.date === raw.date
        );
        if (isDup) continue;
        existing.push({
          id: raw.id ?? `jwgl-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          subject: raw.subject,
          date: raw.date,
          time: raw.time,
          location: raw.location,
          notes: raw.notes,
          source: "jwgl",
          status: "upcoming",
        });
        added++;
      }
      writeExams(prefix, existing);
      return NextResponse.json({ ok: true, added });
    }

    // 单条新增
    const raw = body.exam;
    if (!raw?.subject || !raw?.date) {
      return NextResponse.json({ error: "subject and date are required" }, { status: 400 });
    }
    const exam: Exam = {
      id: `manual-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      subject: raw.subject,
      date: raw.date,
      time: raw.time,
      location: raw.location,
      notes: raw.notes,
      source: "manual",
      status: "upcoming",
    };
    existing.push(exam);
    existing.sort((a, b) => a.date.localeCompare(b.date));
    writeExams(prefix, existing);
    return NextResponse.json({ ok: true, exam });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[/api/exams POST]", (err as Error)?.message);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}

// ── PATCH（更新状态）────────────────────────────────────────

export async function PATCH(request: Request) {
  try {
    const body = await request.json() as {
      id: string;
      status: Exam["status"];
      schoolId?: string;
      userId?: string;
    };

    if (!body.id || !body.status) {
      return NextResponse.json({ error: "id and status are required" }, { status: 400 });
    }

    const db = getServerDB();
    const active = db.findActiveCredentials();
    const prefix = resolveAccountPrefix(
      { schoolId: body.schoolId, userId: body.userId },
      active
    );

    const exams = readExams(prefix);
    const idx = exams.findIndex((e) => e.id === body.id);
    if (idx === -1) {
      return NextResponse.json({ error: "exam not found" }, { status: 404 });
    }

    exams[idx] = {
      ...exams[idx],
      status: body.status,
      completedAt: body.status === "completed" ? Date.now() : undefined,
    };
    writeExams(prefix, exams);
    return NextResponse.json({ ok: true, exam: exams[idx] });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[/api/exams PATCH]", (err as Error)?.message);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}

// ── DELETE ──────────────────────────────────────────────────

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const db = getServerDB();
    const active = db.findActiveCredentials();
    const prefix = resolveAccountPrefix(
      { schoolId: searchParams.get("schoolId"), userId: searchParams.get("userId") },
      active
    );

    const exams = readExams(prefix);
    const target = exams.find((e) => e.id === id);
    if (!target) {
      return NextResponse.json({ error: "exam not found" }, { status: 404 });
    }

    // 手动添加的考试：彻底删除
    // 教务导入的考试：标记 status = "deleted"（不再显示，但保留记录供去重）
    let updated: Exam[];
    if (target.source === "manual") {
      updated = exams.filter((e) => e.id !== id);
    } else {
      updated = exams.map((e) =>
        e.id === id ? { ...e, status: "deleted" as const } : e
      );
    }
    writeExams(prefix, updated);
    return NextResponse.json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[/api/exams DELETE]", (err as Error)?.message);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
