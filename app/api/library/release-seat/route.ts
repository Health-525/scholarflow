import { NextResponse } from "next/server";

import { getCachedJWT, graphql } from "../_lib";

// POST /api/library/release-seat — 释放座位
// Body: { libId: number, seatName: string }
export async function POST(request: Request) {
  const jwt = getCachedJWT();
  if (!jwt) return NextResponse.json({ error: "JWT未配置或已过期" }, { status: 401 });

  let body: { libId?: unknown; seatName?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体格式错误" }, { status: 400 });
  }

  const libId = Number(body.libId);
  if (!Number.isFinite(libId) || libId <= 0) {
    return NextResponse.json({ error: "libId必须是正整数" }, { status: 400 });
  }

  const seatName = typeof body.seatName === "string" ? body.seatName.trim() : "";
  // 限制座位名格式：字母、数字、中文、横线、下划线，防止注入
  if (!seatName || !/^[\u4e00-\u9fa5A-Za-z0-9_-]+$/.test(seatName)) {
    return NextResponse.json({ error: "seatName格式非法" }, { status: 400 });
  }

  const query = `mutation ReleaseSeat($libId: Int!, $seatName: String!) {
    userAuth {
      reserve {
        reserveRelease(libId: $libId, seatName: $seatName)
      }
    }
  }`;
  const r = await graphql(jwt, query, { libId, seatName });

  if (r.data.errors) {
    const msg = r.data.errors[0]?.msg || "释放失败";
    if (msg === "access denied!") return NextResponse.json({ error: "access_denied" }, { status: 403 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const result = r.data?.data?.userAuth?.reserve?.reserveRelease;
  return NextResponse.json({ ok: result !== null, result });
}
