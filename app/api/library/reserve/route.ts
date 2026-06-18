import { NextResponse } from "next/server";

import { getCachedJWT, graphql } from "../_lib";

// POST /api/library/reserve { lib_id, key }
export async function POST(request: Request) {
  const jwt = getCachedJWT();
  if (!jwt) return NextResponse.json({ error: "JWT未配置或已过期" }, { status: 401 });

  let body: { lib_id?: unknown; key?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体格式错误" }, { status: 400 });
  }

  const lib_id = Number(body.lib_id);
  const key = typeof body.key === "string" ? body.key.trim() : "";

  if (!Number.isFinite(lib_id) || lib_id <= 0) {
    return NextResponse.json({ error: "lib_id 必须是正整数" }, { status: 400 });
  }
  if (!key) {
    return NextResponse.json({ error: "缺少 key" }, { status: 400 });
  }

  const query = `mutation ReserveSeat($libId: Int!, $seatKey: String!) {
    userAuth {
      reserve {
        reserueSeat(libId: $libId, seatKey: $seatKey)
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

  const result = r.data.data?.userAuth?.reserve?.reserueSeat;
  // result 结构由 NJTECH 系统决定，通常包含取消预约需要的 sToken
  return NextResponse.json({ success: !!result, data: result });
}
