import { NextResponse } from "next/server";

import { forbiddenResponse, isTrustedOrigin } from "@/lib/auth/origin";
import { reserveSeatBodySchema } from "@/lib/schemas/library-api";

import { getCachedJWT, graphql } from "../_lib";

// POST /api/library/reserve { lib_id, key }
export async function POST(request: Request) {
  if (!isTrustedOrigin(request, { allowInternalToken: true })) {
    return forbiddenResponse();
  }


  const jwt = getCachedJWT();
  if (!jwt) return NextResponse.json({ error: "JWT未配置或已过期" }, { status: 401 });

  const parse = reserveSeatBodySchema.safeParse(await request.json());
  if (!parse.success) {
    return NextResponse.json({ error: "invalid input", issues: parse.error.issues }, { status: 400 });
  }
  const { lib_id, key } = parse.data;

  const query = `mutation ReserveSeat($libId: Int!, $seatKey: String!) {
    userAuth {
      reserve {
        reserveSeat(libId: $libId, seatKey: $seatKey)
      }
    }
  }`;
  const variables = { libId: lib_id, seatKey: key };

  const r = await graphql(jwt, query, variables);
  if (!r.ok) return NextResponse.json({ error: "选座请求失败" }, { status: 500 });

  const errors = r.data.errors;
  if (errors?.length) {
    const msg = errors[0].msg || "未知错误";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const result = r.data.data?.userAuth?.reserve?.reserveSeat;
  // result 结构由 NJTECH 系统决定，通常包含取消预约需要的 sToken
  return NextResponse.json({ success: !!result, data: result });
}
