import { NextRequest, NextResponse } from "next/server";

// 接收 vision-model 的抬头纹提醒
let latestAlert: { score: number; rising: boolean; time: number } | null = null;

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (body.type === "brow_alert") {
    latestAlert = {
      score: body.wrinkle_score,
      rising: body.brow_rising,
      time: body.timestamp || Date.now() / 1000,
    };
    // 30秒后自动清除（比最大冷却时间60s短，但足够宠物轮询到）
    setTimeout(() => { if (latestAlert && latestAlert.time === body.timestamp) latestAlert = null; }, 30000);
  }
  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json(latestAlert || { score: 0, rising: false, time: 0 });
}
