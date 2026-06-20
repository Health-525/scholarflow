import fs from "fs";
import https from "https";
import path from "path";

import { decryptPassword } from "@/lib/crypto-password";

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
      if (data?.token && data?.expiry && data.expiry * 1000 > Date.now()) {
        // 新版 token 为加密字符串；解密失败则视为无效，不再回退明文
        const decrypted = decryptPassword(data.token);
        if (decrypted) return decrypted;
      }
    }
  } catch {}
  return null;
}

export interface GraphQLResponse {
  data?: {
    userAuth?: {
      reserve?: Record<string, unknown> | null;
      user?: Record<string, unknown> | null;
    };
  };
  errors?: Array<{ msg?: string; message?: string }>;
  error?: string;
}

export function graphql<T = GraphQLResponse>(jwt: string, query: string, variables?: Record<string, unknown>) {
  const body = JSON.stringify({ query, variables });
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
