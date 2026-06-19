import { NextResponse } from "next/server";

import { forbiddenResponse, isTrustedOrigin } from "@/lib/auth/origin";


import { getCachedJWT, graphql } from "../_lib";

// GET /api/library/user-rank — 查询用户排名
export async function GET(request: Request) {
  if (!isTrustedOrigin(request, { allowInternalToken: true })) {
    return forbiddenResponse();
  }


  const jwt = getCachedJWT();
  if (!jwt) return NextResponse.json({ error: "JWT未配置或已过期" }, { status: 401 });

  const query = `{userAuth{user{rank(type:"week"){rank} rank(type:"month"){rank} rank(type:"total"){rank}}}}`;
  type Response = {
    errors?: Array<{ msg?: string }>;
    data?: { userAuth?: { user?: { rank?: Array<{ rank?: number }> } } };
  };
  const r = await graphql<Response>(jwt, query);
  if (!r.ok || r.data.errors) {
    const msg = r.data.errors?.[0]?.msg || "请求失败";
    if (msg === "access denied!") return NextResponse.json({ error: "access_denied" }, { status: 403 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const user = r.data.data?.userAuth?.user;
  return NextResponse.json({
    week: user?.rank?.[0]?.rank ?? null,
    month: user?.rank?.[1]?.rank ?? null,
    total: user?.rank?.[2]?.rank ?? null,
  });
}
