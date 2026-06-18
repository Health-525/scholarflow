import fs from "fs";
import https from "https";
import path from "path";

import { NextResponse } from "next/server";

function getCachedJWT(): string | null {
  const mem = globalThis.__libraryJWT;
  if (mem?.token) {
    try {
      const p = JSON.parse(Buffer.from(mem.token.split(".")[1], "base64").toString());
      if (p.expireAt * 1000 > Date.now()) return mem.token;
    } catch {}
  }
  const envJwt = process.env.LIBRARY_JWT;
  if (envJwt) {
    try {
      const p = JSON.parse(Buffer.from(envJwt.split(".")[1], "base64").toString());
      if (p.expireAt * 1000 > Date.now()) return envJwt;
    } catch {}
  }
  const userData = process.env.ELECTRON_USER_DATA || path.join(process.cwd(), ".data");
  const jwtStore = path.join(userData, "library-jwt.json");
  try {
    if (fs.existsSync(jwtStore)) {
      const data = JSON.parse(fs.readFileSync(jwtStore, "utf-8"));
      if (data?.token && data?.expiry && data.expiry * 1000 > Date.now()) return data.token;
    }
  } catch {}
  return null;
}

function graphql<T = unknown>(jwt: string, query: string) {
  const body = JSON.stringify({ query });
  const hostname = process.env.LIBRARY_API_HOSTNAME || "seat.njtech.edu.cn";
  const allowInsecure = process.env.NODE_ENV === "development" || process.env.LIBRARY_ALLOW_INSECURE === "true";
  return new Promise<{ ok: boolean; data: T }>(resolve => {
    const r = https.request({
      method: "POST", hostname, path: "/index.php/graphql/",
      headers: { "Content-Type": "application/json", Cookie: `Authorization=${jwt};v=5.5` },
      rejectUnauthorized: !allowInsecure,
    }, res => {
      let b = "";
      res.on("data", c => (b += c));
      res.on("end", () => {
        try { resolve({ ok: res.statusCode === 200, data: JSON.parse(b) as T }); }
        catch { resolve({ ok: false, data: { error: b } as T }); }
      });
    });
    r.on("error", e => resolve({ ok: false, data: { error: e.message } as T }));
    r.setTimeout(15000, () => r.destroy());
    r.write(body); r.end();
  });
}

// GET /api/library/messages?page=1&num=20&type=1 — 查询消息通知
export async function GET(request: Request) {
  const jwt = getCachedJWT();
  if (!jwt) return NextResponse.json({ error: "JWT未配置或已过期" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const num = parseInt(searchParams.get("num") || "20");
  const type = parseInt(searchParams.get("type") || "1");

  const query = `{userAuth{message{list(page:${page},num:${num},type:${type}){message_id title content create_time isread isused}}}}`;
  type Response = {
    errors?: Array<{ msg?: string }>;
    data?: { userAuth?: { message?: { list?: unknown[] } } };
  };
  const r = await graphql<Response>(jwt, query);
  if (!r.ok || r.data.errors) {
    const msg = r.data.errors?.[0]?.msg || "请求失败";
    if (msg === "access denied!") return NextResponse.json({ error: "access_denied" }, { status: 403 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const messages = r.data.data?.userAuth?.message?.list || [];
  return NextResponse.json({ messages });
}

// POST /api/library/messages/mark-read — 标记消息已读
// body: { ids?: number[] }，不传 ids 则标记当前 type 下所有未读消息
export async function POST(request: Request) {
  const jwt = getCachedJWT();
  if (!jwt) return NextResponse.json({ error: "JWT未配置或已过期" }, { status: 401 });

  let body: { ids?: number[]; page?: number; num?: number; type?: number } = {};
  try { body = await request.json(); } catch {}

  const ids = Array.isArray(body.ids)
    ? body.ids.filter((x): x is number => typeof x === "number" && Number.isFinite(x))
    : [];

  // 如果调用方没传 ids，先拉取消息列表找出所有未读消息的 message_id
  let targetIds = ids;
  if (targetIds.length === 0) {
    const page = Math.max(1, Number(body.page) || 1);
    const num = Math.max(1, Math.min(100, Number(body.num) || 50));
    const type = Number(body.type) || 1;
    const listQuery = `{userAuth{message{list(page:${page},num:${num},type:${type}){message_id isread}}}}`;
    type ListResponse = {
      errors?: Array<{ msg?: string }>;
      data?: { userAuth?: { message?: { list?: Array<{ message_id?: number; isread?: number }> } } };
    };
    const listRes = await graphql<ListResponse>(jwt, listQuery);
    const list = listRes.data?.data?.userAuth?.message?.list || [];
    targetIds = list.filter(m => m.isread === 0).map(m => m.message_id).filter((id): id is number => typeof id === "number");
  }

  if (targetIds.length === 0) {
    return NextResponse.json({ success: true, marked: 0 });
  }

  const query = `mutation { userAuth { message { readed(messageIds: [${targetIds.join(",")}]) } } }`;
  type MarkResponse = {
    errors?: Array<{ msg?: string }>;
    data?: { userAuth?: { message?: { readed?: boolean } } };
  };
  const r = await graphql<MarkResponse>(jwt, query);
  if (!r.ok || r.data.errors) {
    const msg = r.data.errors?.[0]?.msg || "请求失败";
    if (msg === "access denied!") return NextResponse.json({ error: "access_denied" }, { status: 403 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ success: r.data.data?.userAuth?.message?.readed === true, marked: targetIds.length });
}
