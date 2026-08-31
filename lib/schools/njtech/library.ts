/**
 * NJTECH 图书馆座位查询
 * 搬自 timetable/scripts/fetch_library.js，改为 TypeScript 函数化
 *
 * 数据源: seat.njtech.edu.cn GraphQL API
 * 认证: JWT Token (从浏览器手动获取)
 */

import https from "https";

import type { LibraryData, LibraryRoom } from "../types";

// ── GraphQL 请求 ────────────────────────────────────────────

async function graphql<T>(
  token: string,
  query: string,
  variables: Record<string, unknown> = {}
): Promise<{ ok: boolean; data?: T; error?: string }> {
  const body = JSON.stringify({ query, variables });

  return new Promise((resolve) => {
    const rq = https.request(
      {
        method: "POST",
        hostname: "seat.njtech.edu.cn",
        path: "/index.php/graphql/",
        headers: {
          "User-Agent": "scholarflow-library-agent/1.0",
          "Content-Type": "application/json",
          Cookie: `Authorization=${token};v=5.5`,
          Accept: "application/json",
        },
      },
      (r) => {
        let b = "";
        r.on("data", (c: Buffer) => (b += c.toString()));
        r.on("end", () => {
          try {
            const parsed = JSON.parse(b);
            resolve({ ok: r.statusCode === 200, data: parsed as T });
          } catch (e) {
            resolve({ ok: false, error: b });
          }
        });
      }
    );
    rq.on("error", (e: Error) => resolve({ ok: false, error: e.message }));
    rq.write(body);
    rq.end();
  });
}

// ── 数据抓取 ────────────────────────────────────────────────

interface GraphqlLibsResponse {
  data?: {
    userAuth?: {
      reserve?: {
        libs?: LibraryRoom[];
      };
    };
  };
  errors?: unknown[];
}

/**
 * 抓取所有阅览室座位信息
 * @param jwt - 图书馆 JWT Token
 */
export async function fetchLibrarySeats(jwt: string): Promise<LibraryData> {
  const q = `{userAuth{reserve{libs{lib_id lib_name lib_floor is_open lib_type lib_group_id lib_rt{seats_total seats_used seats_booking seats_has open_time_str close_time_str}}}}}`;

  const result = await graphql<GraphqlLibsResponse>(jwt, q);

  if (!result.ok || !result.data?.data?.userAuth?.reserve?.libs) {
    throw new Error(
      `图书馆数据获取失败: ${result.error || JSON.stringify(result.data?.errors || {})}`
    );
  }

  const libs = result.data.data.userAuth.reserve.libs;

  const total = libs.reduce((s, l) => s + (l.lib_rt?.seats_total || 0), 0);
  const used = libs.reduce((s, l) => s + (l.lib_rt?.seats_used || 0), 0);
  const avail = total - used;

  return {
    updated: new Date().toISOString(),
    summary: {
      total,
      used,
      avail,
      rate: total > 0 ? avail / total : 0,
    },
    libs,
  };
}


