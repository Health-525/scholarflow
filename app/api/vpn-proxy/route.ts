import { NextResponse } from "next/server";
import https from "https";
import fs from "fs";
import path from "path";

// Shared JWT cache (cross-route via globalThis + filesystem fallback)
function getCachedJWT(): string | null {
  // 1. In-memory (set by auth/jwt POST)
  const mem = globalThis.__libraryJWT;
  if (mem?.token) {
    try {
      const p = JSON.parse(Buffer.from(mem.token.split(".")[1], "base64").toString());
      if (p.expireAt * 1000 > Date.now()) return mem.token;
    } catch {}
  }

  // 2. Env var
  const envJwt = process.env.LIBRARY_JWT;
  if (envJwt) {
    try {
      const p = JSON.parse(Buffer.from(envJwt.split(".")[1], "base64").toString());
      if (p.expireAt * 1000 > Date.now()) return envJwt;
    } catch {}
  }

  // 3. JWT 持久化文件（auth/jwt route 写入的）
  const userData = process.env.ELECTRON_USER_DATA || path.join(process.cwd(), ".data");
  const jwtStore = path.join(userData, "library-jwt.json");
  try {
    if (fs.existsSync(jwtStore)) {
      const data = JSON.parse(fs.readFileSync(jwtStore, "utf-8"));
      if (data?.token && data?.expiry && data.expiry * 1000 > Date.now()) return data.token;
    }
  } catch {}

  // 4. timetable/.env file
  const candidates = [
    path.join(process.cwd(), "..", "timetable", ".env"),
    path.join(process.cwd(), ".env"),
  ];
  for (const p of candidates) {
    try {
      const env = fs.readFileSync(p, "utf8");
      const m = env.match(/LIBRARY_JWT=(.+)/);
      if (m) {
        const jwt = m[1].trim();
        const payload = JSON.parse(Buffer.from(jwt.split(".")[1], "base64").toString());
        if (payload.expireAt * 1000 > Date.now()) return jwt;
      }
    } catch {}
  }

  return null;
}

interface LibraryRoom {
  lib_id: number;
  lib_name: string;
  lib_floor: string;
  is_open: boolean;
  lib_group_id: number;
  lib_rt: {
    seats_total: number;
    seats_used: number;
    seats_booking: number;
    seats_has: number;
    open_time_str: string;
    close_time_str: string;
  };
}

interface GraphQLResponse {
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

async function graphql(jwt: string, query: string) {
  const body = JSON.stringify({ query });
  const hostname = process.env.LIBRARY_API_HOSTNAME || "seat.njtech.edu.cn";
  const allowInsecure = process.env.NODE_ENV === "development" || process.env.LIBRARY_ALLOW_INSECURE === "true";

  return new Promise<{ ok: boolean; data: GraphQLResponse }>(resolve => {
    const r = https.request({
      method: "POST",
      hostname,
      path: "/index.php/graphql/",
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

export async function GET() {
  const jwt = getCachedJWT();
  if (!jwt) return NextResponse.json({ error: "JWT未配置或已过期，请在Chrome图书馆页F12运行同步命令" }, { status: 401 });

  const q = `{userAuth{reserve{libs{lib_id lib_name lib_floor is_open lib_group_id lib_rt{seats_total seats_used seats_booking seats_has open_time_str close_time_str}}}}}`;
  const r = await graphql(jwt, q);
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
