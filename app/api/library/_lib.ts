import https from "https";
import fs from "fs";
import path from "path";

export function getCachedJWT(): string | null {
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

// GraphQL response type
interface GraphQLResponse {
  data?: {
    userAuth?: {
      reserve?: {
        reserve?: Record<string, unknown> | null;
        reserveCancle?: { __typename?: string } | null;
        reserveRelease?: number | null;
        reserveHold?: unknown;
        reserueSeat?: Record<string, unknown> | null;
      };
      user?: {
        rank?: { rank: number } | null;
      };
    };
  };
  errors?: Array<{ msg?: string; message?: string }>;
  error?: string;
}

export function graphql(jwt: string, query: string) {
  const body = JSON.stringify({ query });
  const hostname = process.env.LIBRARY_API_HOSTNAME || "seat.njtech.edu.cn";
  const allowInsecure = process.env.NODE_ENV === "development" || process.env.LIBRARY_ALLOW_INSECURE === "true";
  return new Promise<{ ok: boolean; data: GraphQLResponse }>(resolve => {
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
