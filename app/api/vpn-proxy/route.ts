import { NextResponse } from "next/server";

import { forbiddenResponse, isTrustedOrigin } from "@/lib/auth/origin";

import { getCachedJWT, graphql } from "../library/_lib";

interface LibraryRoom {
  lib_id: number;
  lib_name: string;
  lib_floor: string;
  is_open: boolean;
  lib_type?: number;
  lib_group_id: number;
  lib_rt: {
    seats_total: number;
    seats_used: number;
    seats_booking: number;
    seats_has: number;
    reserve_ttl: number;
    open_time_str: string;
    close_time_str: string;
    advance_booking: string;
  };
}

interface VPNGraphQLResponse {
  data?: {
    userAuth?: {
      reserve?: {
        libs?: LibraryRoom[];
      };
    };
  };
  errors?: Array<{ msg: string }>;
  error?: string;
}

export async function GET(request: Request) {
  if (!isTrustedOrigin(request, { allowInternalToken: true })) {
    return forbiddenResponse();
  }

  const jwt = getCachedJWT();
  if (!jwt) return NextResponse.json({ error: "JWT未配置或已过期，请在Chrome图书馆页F12运行同步命令" }, { status: 401 });

  const query = `{
    userAuth { reserve { libs {
      lib_id lib_name lib_floor is_open lib_type lib_group_id
      lib_rt { seats_total seats_used seats_booking seats_has reserve_ttl open_time_str close_time_str advance_booking }
    } } }
  }`;
  const r = await graphql<VPNGraphQLResponse>(jwt, query);
  if (!r.ok || r.data.errors) return NextResponse.json({ error: r.data?.errors?.[0]?.msg || "请求失败" }, { status: 500 });

  const libs: LibraryRoom[] = r.data?.data?.userAuth?.reserve?.libs || [];
  const total = libs.reduce((s, l) => s + (l.lib_rt?.seats_total || 0), 0);
  const used = libs.reduce((s, l) => s + (l.lib_rt?.seats_used || 0), 0);

  return NextResponse.json({
    updated: new Date().toISOString(),
    summary: { total, used, avail: total - used, rate: total > 0 ? (total - used) / total : 0 },
    libs,
  });
}
