import { NextResponse } from "next/server";
import { getCachedJWT, graphql } from "../_lib";

// GET /api/library/reserve-status — 查询当前预约状态
export async function GET() {
  const jwt = getCachedJWT();
  if (!jwt) return NextResponse.json({ error: "JWT未配置或已过期" }, { status: 401 });

  const query = `{userAuth{reserve{reserve{lib_id seat_key seat_name lib_name status user_id date token}}}}`;
  const r = await graphql(jwt, query);
  if (r.data.errors) {
    const msg = r.data.errors[0]?.msg || "请求失败";
    if (msg === "access denied!") return NextResponse.json({ error: "access_denied" }, { status: 403 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const reserve = r.data?.data?.userAuth?.reserve?.reserve || null;
  return NextResponse.json({ reserve });
}
