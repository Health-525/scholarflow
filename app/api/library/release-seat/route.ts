import { NextResponse } from "next/server";
import { getCachedJWT, graphql } from "../_lib";

// POST /api/library/release-seat — 释放座位
// Body: { libId: number, seatName: string }
export async function POST(request: Request) {
  const jwt = getCachedJWT();
  if (!jwt) return NextResponse.json({ error: "JWT未配置或已过期" }, { status: 401 });

  const { libId, seatName } = await request.json();
  if (!libId || !seatName) return NextResponse.json({ error: "缺少libId或seatName" }, { status: 400 });

  // reserveRelease returns Int
  const query = `mutation{userAuth{reserve{reserveRelease(libId:${libId},seatName:"${seatName}")}}}`;
  const r = await graphql(jwt, query);

  if (r.data.errors) {
    const msg = r.data.errors[0]?.msg || "释放失败";
    if (msg === "access denied!") return NextResponse.json({ error: "access_denied" }, { status: 403 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const result = r.data?.data?.userAuth?.reserve?.reserveRelease;
  return NextResponse.json({ ok: result !== null, result });
}
