import { NextResponse } from "next/server";

import { forbiddenResponse, isTrustedOrigin } from "@/lib/auth/origin";
import { cancelReserveBodySchema } from "@/lib/schemas/library-api";

import { getCachedJWT, graphql } from "../_lib";

// POST /api/library/cancel-reserve — 取消预约
// Body: { sToken: string }
export async function POST(request: Request) {
  if (!isTrustedOrigin(request, { allowInternalToken: true })) {
    return forbiddenResponse();
  }


  const jwt = getCachedJWT();
  if (!jwt) return NextResponse.json({ error: "JWT未配置或已过期" }, { status: 401 });

  const parse = cancelReserveBodySchema.safeParse(await request.json());
  if (!parse.success) {
    return NextResponse.json({ error: "invalid input", issues: parse.error.issues }, { status: 400 });
  }
  const { sToken } = parse.data;

  // 限制 sToken 格式：只允许字母、数字、横线、下划线，防止注入
  if (!/^[A-Za-z0-9_-]+$/.test(sToken)) {
    return NextResponse.json({ error: "sToken格式非法" }, { status: 400 });
  }

  const query = `mutation CancelReserve($sToken: String!) {
    userAuth {
      reserve {
        reserveCancle(sToken: $sToken) { __typename }
      }
    }
  }`;
  const r = await graphql(jwt, query, { sToken });

  if (r.data.errors) {
    const msg = r.data.errors[0]?.msg || "取消失败";
    if (msg === "access denied!") return NextResponse.json({ error: "access_denied" }, { status: 403 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const result = r.data?.data?.userAuth?.reserve?.reserveCancle;
  return NextResponse.json({ ok: !!result, result });
}
