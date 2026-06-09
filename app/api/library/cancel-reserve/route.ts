import { NextResponse } from "next/server";
import { getCachedJWT, graphql } from "../_lib";

// POST /api/library/cancel-reserve — 取消预约
// Body: { sToken: string }
export async function POST(request: Request) {
  const jwt = getCachedJWT();
  if (!jwt) return NextResponse.json({ error: "JWT未配置或已过期" }, { status: 401 });

  const { sToken } = await request.json();
  if (!sToken) return NextResponse.json({ error: "缺少sToken参数" }, { status: 400 });

  // reserveCancle returns reserveCancle type — query __typename to get result
  const query = `mutation{userAuth{reserve{reserveCancle(sToken:"${sToken}"){__typename}}}}`;
  const r = await graphql(jwt, query);

  if (r.data.errors) {
    const msg = r.data.errors[0]?.msg || "取消失败";
    if (msg === "access denied!") return NextResponse.json({ error: "access_denied" }, { status: 403 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const result = r.data?.data?.userAuth?.reserve?.reserveCancle;
  return NextResponse.json({ ok: !!result, result });
}
