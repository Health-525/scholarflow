import { NextResponse } from "next/server";

import { forbiddenResponse, isTrustedOrigin } from "@/lib/auth/origin";


import { getCachedJWT, graphql } from "../_lib";

// POST /api/library/hold-seat — 暂离（保留座位）
export async function POST(request: Request) {
  if (!isTrustedOrigin(request, { allowInternalToken: true })) {
    return forbiddenResponse();
  }


  const jwt = getCachedJWT();
  if (!jwt) return NextResponse.json({ error: "JWT未配置或已过期" }, { status: 401 });

  // reserveHold takes no arguments, returns null on success or error
  const r = await graphql(jwt, `mutation{userAuth{reserve{reserveHold}}}`);
  if (r.data.errors) {
    const msg = r.data.errors[0]?.msg || "暂离失败";
    if (msg === "access denied!") return NextResponse.json({ error: "access_denied" }, { status: 403 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
