import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

let cachedJWT = "", jwtExpiry = 0;

// Shared JWT cache type for cross-route communication
interface LibraryJWTCache {
  token: string;
  expiry: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __libraryJWT: LibraryJWTCache | undefined;
}

// ── JWT 持久化（app 重启不丢失）──────────────────────────
function getJWTStorePath(): string {
  // Electron: userData 目录; Next.js dev: 项目根目录
  const userData = process.env.ELECTRON_USER_DATA || path.join(process.cwd(), ".data");
  return path.join(userData, "library-jwt.json");
}

function persistJWT(token: string, expiry: number) {
  try {
    const storePath = getJWTStorePath();
    fs.mkdirSync(path.dirname(storePath), { recursive: true });
    fs.writeFileSync(storePath, JSON.stringify({ token, expiry }), "utf-8");
  } catch {}
}

function loadPersistedJWT(): { token: string; expiry: number } | null {
  try {
    const storePath = getJWTStorePath();
    if (!fs.existsSync(storePath)) return null;
    const data = JSON.parse(fs.readFileSync(storePath, "utf-8"));
    if (data?.token && data?.expiry && data.expiry * 1000 > Date.now()) {
      return data;
    }
  } catch {}
  return null;
}

// 启动时恢复持久化的 JWT
(function initFromPersistence() {
  const saved = loadPersistedJWT();
  if (saved) {
    cachedJWT = saved.token;
    jwtExpiry = saved.expiry;
    globalThis.__libraryJWT = { token: saved.token, expiry: saved.expiry };
  }
})();

function cors(body: Record<string, unknown>, status = 200) {
  return new NextResponse(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": process.env.CORS_ORIGIN || "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Private-Network": "true",
    },
  });
}

export async function GET() {
  // 尝试从持久化恢复
  if (!cachedJWT || jwtExpiry * 1000 <= Date.now()) {
    const saved = loadPersistedJWT();
    if (saved) {
      cachedJWT = saved.token;
      jwtExpiry = saved.expiry;
      globalThis.__libraryJWT = { token: saved.token, expiry: saved.expiry };
    }
  }
  const valid = jwtExpiry * 1000 > Date.now();
  return cors({ valid, jwt: valid ? cachedJWT : null, expiry: valid ? new Date(jwtExpiry * 1000).toISOString() : null });
}

export async function POST(request: Request) {
  try {
    const { cookie } = await request.json();
    const match = cookie.match(/Authorization=([^;]+)/);
    if (!match) return cors({ ok: false, error: "未找到Authorization cookie" }, 400);
    cachedJWT = match[1];
    try { const p = JSON.parse(Buffer.from(cachedJWT.split(".")[1], "base64").toString()); jwtExpiry = p.expireAt || 0; } catch {}
    // Share with vpn-proxy via globalThis
    globalThis.__libraryJWT = { token: cachedJWT, expiry: jwtExpiry };
    // 持久化到磁盘
    persistJWT(cachedJWT, jwtExpiry);
    return cors({ ok: true, expiry: new Date(jwtExpiry * 1000).toISOString() });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return cors({ ok: false, error: message }, 500);
  }
}

export async function OPTIONS() { return cors({ ok: true }); }
