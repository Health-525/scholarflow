import fs from "fs";
import path from "path";

import { NextResponse } from "next/server";

import { decryptPassword, encryptPassword } from "@/lib/crypto-password";

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
    fs.writeFileSync(
      storePath,
      JSON.stringify({ token: encryptPassword(token), expiry }),
      "utf-8"
    );
  } catch {}
}

function loadPersistedJWT(): { token: string; expiry: number } | null {
  try {
    const storePath = getJWTStorePath();
    if (!fs.existsSync(storePath)) return null;
    const data = JSON.parse(fs.readFileSync(storePath, "utf-8"));
    if (!data?.token || !data?.expiry) return null;
    if (data.expiry * 1000 <= Date.now()) return null;
    // 新版：token 为加密字符串；解密失败则视为无效，不再回退明文
    const decrypted = decryptPassword(data.token);
    if (!decrypted) return null;
    return { token: decrypted, expiry: data.expiry };
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

const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3456",
  "https://localhost:3456",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3456",
];

function getAllowedOrigins(): string[] {
  const configured = process.env.CORS_ORIGIN;
  if (!configured) return DEFAULT_ALLOWED_ORIGINS;
  if (configured === "*") return [];
  return configured.split(",").map((s) => s.trim()).filter(Boolean);
}

function resolveOrigin(request: Request): string | null {
  const allowed = getAllowedOrigins();
  if (allowed.length === 0) return "*";
  const origin = request.headers.get("origin");
  if (!origin) return allowed[0];
  return allowed.find((o) => o === origin) || allowed[0];
}

function cors(request: Request, body: Record<string, unknown>, status = 200) {
  const allowOrigin = resolveOrigin(request);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
  if (allowOrigin) {
    headers["Access-Control-Allow-Origin"] = allowOrigin;
    if (allowOrigin !== "*") {
      headers["Access-Control-Allow-Credentials"] = "true";
      headers["Access-Control-Allow-Private-Network"] = "true";
    }
  }
  return new NextResponse(JSON.stringify(body), { status, headers });
}

export async function GET(request: Request) {
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
  return cors(request, { valid, jwt: valid ? cachedJWT : null, expiry: valid ? new Date(jwtExpiry * 1000).toISOString() : null });
}

export async function POST(request: Request) {
  try {
    const { cookie } = await request.json();
    const match = cookie.match(/Authorization=([^;]+)/);
    if (!match) return cors(request, { ok: false, error: "未找到Authorization cookie" }, 400);
    cachedJWT = match[1];
    try { const p = JSON.parse(Buffer.from(cachedJWT.split(".")[1], "base64").toString()); jwtExpiry = p.expireAt || 0; } catch {}
    // Share with vpn-proxy via globalThis
    globalThis.__libraryJWT = { token: cachedJWT, expiry: jwtExpiry };
    // 持久化到磁盘
    persistJWT(cachedJWT, jwtExpiry);
    return cors(request, { ok: true, expiry: new Date(jwtExpiry * 1000).toISOString() });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return cors(request, { ok: false, error: message }, 500);
  }
}

export async function OPTIONS(request: Request) { return cors(request, { ok: true }); }
