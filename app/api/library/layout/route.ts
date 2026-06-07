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

// GET /api/library/layout?lib_id=123
export async function GET(request: Request) {
  const jwt = getCachedJWT();
  if (!jwt) return NextResponse.json({ error: "JWT未配置或已过期" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const libId = searchParams.get("lib_id");
  if (!libId) return NextResponse.json({ error: "缺少 lib_id" }, { status: 400 });

  const query = `{userAuth{reserve{libs(libId:${libId}){lib_id lib_name lib_floor lib_rt{seats_total seats_used seats_has open_time_str close_time_str}lib_layout{seats{x y key name seat_status status}}}}}}`;
  const r = await graphql(jwt, query);
  if (!r.ok || r.data.errors) return NextResponse.json({ error: r.data?.errors?.[0]?.msg || "请求失败" }, { status: 500 });

  const lib = r.data?.data?.userAuth?.reserve?.libs?.[0];
  if (!lib) return NextResponse.json({ error: "未找到该阅览室" }, { status: 404 });

  return NextResponse.json(lib);
}
