import { NextResponse } from "next/server";

import { getCachedJWT, graphql } from "../_lib";

// POST /api/library/reserve { lib_id, key }
export async function POST(request: Request) {
  const jwt = getCachedJWT();
  if (!jwt) return NextResponse.json({ error: "JWT未配置或已过期" }, { status: 401 });

  const { lib_id, key } = await request.json();
  if (!lib_id || !key) return NextResponse.json({ error: "缺少 lib_id 或 key" }, { status: 400 });

  const query = `mutation ReserveSeat($libId: Int!, $seatKey: String!) {
  userAuth {
    reserve {
      reserueSeat(libId: $libId, seatKey: $seatKey)
    }
  }
}`;
  const variables = { libId: Number(lib_id), seatKey: key };

  const r = await graphql(jwt, query, variables);
  if (!r.ok) return NextResponse.json({ error: "选座请求失败" }, { status: 500 });

  // 检查 GraphQL errors
  const errors = r.data.errors;
  if (errors?.length) {
    const msg = errors[0].msg || "未知错误";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const result = r.data.data?.userAuth?.reserve?.reserueSeat;
  return NextResponse.json({ success: !!result, data: result });
}
