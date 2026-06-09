import { NextResponse } from "next/server";
import https from "https";
import fs from "fs";
import path from "path";

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

function graphql(jwt: string, query: string) {
  const body = JSON.stringify({ query });
  const hostname = process.env.LIBRARY_API_HOSTNAME || "seat.njtech.edu.cn";
  const allowInsecure = process.env.NODE_ENV === "development" || process.env.LIBRARY_ALLOW_INSECURE === "true";
  return new Promise<{ ok: boolean; data: any }>(resolve => {
    const r = https.request({
      method: "POST", hostname, path: "/index.php/graphql/",
      headers: { "Content-Type": "application/json", Cookie: `Authorization=${jwt};v=5.5` },
      rejectUnauthorized: !allowInsecure,
    }, res => {
      let b = "";
      res.on("data", c => (b += c));
      res.on("end", () => {
        try { resolve({ ok: res.statusCode === 200, data: JSON.parse(b) }); }
        catch { resolve({ ok: false, data: { error: b } }); }
      });
    });
    r.on("error", e => resolve({ ok: false, data: { error: e.message } }));
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

  const query = `{userAuth{message{list(page:${page},num:${num},type:${type}){title content create_time isread isused}}}}`;
  const r = await graphql(jwt, query);
  if (!r.ok || r.data.errors) {
    const msg = r.data?.errors?.[0]?.msg || "请求失败";
    if (msg === "access denied!") return NextResponse.json({ error: "access_denied" }, { status: 403 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const messages = r.data?.data?.userAuth?.message?.list || [];
  return NextResponse.json({ messages });
}
