import { NextResponse } from "next/server";

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
    return cors({ ok: true, expiry: new Date(jwtExpiry * 1000).toISOString() });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return cors({ ok: false, error: message }, 500);
  }
}

export async function OPTIONS() { return cors({ ok: true }); }
