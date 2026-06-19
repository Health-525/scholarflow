import { NextResponse } from "next/server";

import { getCachedJWT, graphql } from "../_lib";

// GET /api/library/seat-layout?lib_id=123
export async function GET(request: Request) {
  const jwt = getCachedJWT();
  if (!jwt) return NextResponse.json({ error: "JWT未配置或已过期" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const rawLibId = searchParams.get("lib_id");
  const libId = rawLibId ? Number(rawLibId) : NaN;
  if (!Number.isFinite(libId) || libId <= 0) {
    return NextResponse.json({ error: "lib_id必须是正整数" }, { status: 400 });
  }

  const query = `query SeatLayout($libId: Int!) {
    userAuth {
      reserve {
        libs(libId: $libId) {
          lib_id
          lib_name
          lib_floor
          lib_rt {
            seats_total
            seats_used
            seats_has
            open_time_str
            close_time_str
          }
          lib_layout {
            seats {
              x
              y
              key
              name
              seat_status
              status
            }
          }
        }
      }
    }
  }`;

  type Response = {
    errors?: Array<{ msg?: string }>;
    data?: { userAuth?: { reserve?: { libs?: unknown[] } } };
  };
  const r = await graphql<Response>(jwt, query, { libId });
  if (!r.ok || r.data.errors) return NextResponse.json({ error: r.data.errors?.[0]?.msg || "请求失败" }, { status: 500 });

  const lib = r.data.data?.userAuth?.reserve?.libs?.[0];
  if (!lib) return NextResponse.json({ error: "未找到该阅览室" }, { status: 404 });

  return NextResponse.json(lib);
}
