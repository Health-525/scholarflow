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

// POST /api/library/reserve { lib_id, key }
export async function POST(request: Request) {
  const jwt = getCachedJWT();
  if (!jwt) return NextResponse.json({ error: "JWT未配置或已过期" }, { status: 401 });

  const { lib_id, key } = await request.json();
  if (!lib_id || !key) return NextResponse.json({ error: "缺少 lib_id 或 key" }, { status: 400 });

  const query = `mutation{userAuth{reserve{reserueSeat(libId:${lib_id},seatKey:"${key}")}}}`;
  const r = await graphql(jwt, query);
  if (!r.ok) return NextResponse.json({ error: "选座请求失败" }, { status: 500 });

  // 检查 GraphQL errors
  const errors = r.data?.errors;
  if (errors?.length) {
    const msg = errors[0].msg || "未知错误";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const result = r.data?.data?.userAuth?.reserve?.reserueSeat;
  return NextResponse.json({ success: !!result, data: result });
}
