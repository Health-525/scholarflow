import { NextResponse } from "next/server";

import { forbiddenResponse, isTrustedOrigin } from "@/lib/auth/origin";
import { seatLayoutQuerySchema } from "@/lib/schemas/library-api";

import { getCachedJWT, graphql } from "../_lib";

// GET /api/library/seat-layout?lib_id=123
export async function GET(request: Request) {
  if (!isTrustedOrigin(request, { allowInternalToken: true })) {
    return forbiddenResponse();
  }


  const jwt = getCachedJWT();
  if (!jwt) return NextResponse.json({ error: "JWT未配置或已过期" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const parse = seatLayoutQuerySchema.safeParse(Object.fromEntries(searchParams.entries()));
  if (!parse.success) {
    return NextResponse.json({ error: "invalid input", issues: parse.error.issues }, { status: 400 });
  }
  const { lib_id: libId } = parse.data;

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
