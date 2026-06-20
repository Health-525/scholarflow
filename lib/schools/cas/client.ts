/**
 * CAS 统一认证客户端 — 河北农业大学
 *
 * CAS (cas.hebau.edu.cn) + CryptoJS AES-CBC 加密
 * 登录成功 → 302 到 reAuthCheck → 绕过 MFA → 302 到 URP → GS_SESSIONID
 */

import * as crypto from "crypto";
import * as fs from "fs";
import * as https from "https";
import * as http from "http";

export interface CasSession {
  sessionCookie: string;
  username: string;
  allCookies: string;
  targetBaseUrl: string;
}

interface HttpResponse {
  statusCode: number;
  headers: Record<string, string | string[] | undefined>;
  body: string;
  cookies: Map<string, string>;
}

// ── HTTP ──────────────────────────────────────────────────────

function parseCookies(headers: string[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const h of headers) {
    const i = h.indexOf("=");
    if (i > 0) m.set(h.substring(0, i).trim(), h.split(";")[0].substring(i + 1).trim());
  }
  return m;
}

function cookiesToHeader(c: Map<string, string>): string {
  return [...c.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

function httpRequest(url: string, opts?: {
  method?: string; headers?: Record<string, string>; body?: string;
  followRedirect?: boolean; maxRedirects?: number;
  _cookies?: Map<string, string>;
}): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    const { method = "GET", headers = {}, body, followRedirect = true, maxRedirects = 10, _cookies } = opts || {};
    const u = new URL(url);
    const t = u.protocol === "https:" ? https : http;

    const reqCookies = new Map(_cookies || []);
    if (headers["Cookie"]) {
      for (const p of headers["Cookie"].split(";")) {
        const eq = p.indexOf("=");
        if (eq > 0) reqCookies.set(p.substring(0, eq).trim(), p.substring(eq + 1).trim());
      }
    }
    const hdrs: Record<string, string> = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      Accept: "text/html,application/xhtml+xml,*/*",
      "Accept-Language": "zh-CN,zh;q=0.9",
      ...headers,
    };
    if (reqCookies.size > 0) hdrs["Cookie"] = cookiesToHeader(reqCookies);

    const req = t.request({
      hostname: u.hostname, port: u.port || (u.protocol === "https:" ? 443 : 80),
      path: u.pathname + u.search, method, headers: hdrs, rejectUnauthorized: false,
    }, (res) => {
      if (followRedirect && res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && maxRedirects > 0) {
        const merged = new Map(reqCookies);
        if (res.headers["set-cookie"]) {
          for (const [k, v] of parseCookies(Array.isArray(res.headers["set-cookie"]) ? res.headers["set-cookie"] : [res.headers["set-cookie"]])) merged.set(k, v);
        }
        httpRequest(new URL(res.headers.location, url).toString(), {
          ...opts, headers: {}, maxRedirects: maxRedirects - 1, _cookies: merged,
        }).then(resolve).catch(reject);
        return;
      }
      const chunks: Buffer[] = [];
      res.on("data", (c: Buffer) => chunks.push(c));
      res.on("end", () => {
        const body = Buffer.concat(chunks).toString("utf-8");
        const setCookies = res.headers["set-cookie"];
        const rc = setCookies ? parseCookies(Array.isArray(setCookies) ? setCookies : [setCookies]) : new Map<string, string>();
        const all = new Map(reqCookies);
        for (const [k, v] of rc) all.set(k, v);
        resolve({ statusCode: res.statusCode || 0, headers: res.headers as Record<string, string | string[] | undefined>, body, cookies: all });
      });
    });
    req.on("error", reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error("超时")); });
    if (body) req.write(body);
    req.end();
  });
}

// ── CryptoJS 兼容 AES-CBC ────────────────────────────────────

const AES_CHARS = "ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678";
function randStr(n: number): string { let s = ""; for (let i = 0; i < n; i++) s += AES_CHARS[Math.floor(Math.random() * AES_CHARS.length)]; return s; }

function encryptPassword(pwd: string, salt: string): string {
  // 河北农大官网 encrypt.js 的行为：
  // 1. 明文 = 64 位随机前缀 + 原密码
  // 2. key = pwdEncryptSalt 的 UTF-8 字节
  // 3. iv = 16 位随机字符的 UTF-8 字节
  // 4. 输出仅为密文的 base64，不附带 iv 前缀
  const pt = randStr(64) + pwd;
  const key = Buffer.from(salt.trim(), "utf-8");
  const iv = Buffer.from(randStr(16), "utf-8");
  const cipher = crypto.createCipheriv("aes-128-cbc", key, iv);
  cipher.setAutoPadding(true);
  const encrypted = Buffer.concat([cipher.update(pt, "utf-8"), cipher.final()]);
  return encrypted.toString("base64");
}

// ── CAS 登录 ─────────────────────────────────────────────────

export async function casLogin(casBaseUrl: string, targetBaseUrl: string, username: string, password: string): Promise<CasSession> {
  const traceId = crypto.randomUUID();
  // #region debug-point A:report-helper
  const reportDebug = (hypothesisId: string, msg: string, data: Record<string, unknown>) => {
    let debugUrl = "http://127.0.0.1:7777/event";
    let sessionId = "hebau-cas-login";
    try {
      const envText = fs.readFileSync(".dbg/hebau-cas-login.env", "utf8");
      debugUrl = envText.match(/DEBUG_SERVER_URL=(.+)/)?.[1]?.trim() || debugUrl;
      sessionId = envText.match(/DEBUG_SESSION_ID=(.+)/)?.[1]?.trim() || sessionId;
    } catch {}
    fetch(debugUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        runId: "pre-fix",
        hypothesisId,
        traceId,
        location: "lib/schools/cas/client.ts",
        msg: `[DEBUG] ${msg}`,
        data,
        ts: Date.now(),
      }),
    }).catch(() => {});
  };
  // #endregion
  const serviceUrl = targetBaseUrl + "/jwapp/sys/homeapp/index.do";

  // Step 1: 获取登录页
  const lp = await httpRequest(`${casBaseUrl}/authserver/login?service=${encodeURIComponent(serviceUrl)}`);
  const execM = lp.body.match(/name="execution"\s+value="([^"]*)"/);
  const execution = execM?.[1] || "";
  const saltM = lp.body.match(/id="pwdEncryptSalt"\s+value="([^"]*)"/);
  const salt = saltM?.[1] || "";
  // #region debug-point A:login-page
  reportDebug("A", "cas login page parsed", {
    statusCode: lp.statusCode,
    traceId,
    hasExecution: Boolean(execution),
    saltLength: salt.length,
    cookieNames: [...lp.cookies.keys()],
    hasCaptchaKeyword: /captcha|验证码/i.test(lp.body),
    hasAuthErrorKeyword: /error|认证失败|账号|密码/i.test(lp.body),
  });
  // #endregion
  if (!execution) throw new Error("无法获取 CAS execution");

  const cookies = new Map(lp.cookies);
  const ep = salt ? encryptPassword(password, salt) : password;

  // Step 2: POST 登录
  const body = new URLSearchParams({
    username, passwordText: password, password: ep,
    execution, _eventId: "submit", lt: "",
    cllt: "userNameLogin", dllt: "generalLogin", rememberMe: "true",
    service: serviceUrl,
  }).toString();

  const loginResp = await httpRequest(`${casBaseUrl}/authserver/login?service=${encodeURIComponent(serviceUrl)}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: cookiesToHeader(cookies) },
    body,
    followRedirect: false,
  });
  // #region debug-point B:login-response
  reportDebug("B", "cas login response received", {
    statusCode: loginResp.statusCode,
    traceId,
    locationHeader: typeof loginResp.headers.location === "string" ? loginResp.headers.location.slice(0, 200) : "",
    cookieNames: [...loginResp.cookies.keys()],
    bodyHasPwdEncryptSalt: loginResp.body.includes("pwdEncryptSalt"),
    bodyHasReauthCheck: /reAuthCheck/i.test(loginResp.body),
    bodyHasCaptchaKeyword: /captcha|验证码/i.test(loginResp.body),
    bodyHasAuthErrorKeyword: /error|失败|密码|账号|认证/i.test(loginResp.body),
    bodySnippet: loginResp.body.slice(0, 500),
  });
  // #endregion

  for (const [k, v] of loginResp.cookies) cookies.set(k, v);

  // 检查登录失败
  if (loginResp.body.includes("pwdEncryptSalt")) {
    throw new Error("学号或密码不正确");
  }

  // Step 3: 处理重定向 — 如果是 reAuthCheck，尝试绕过
  const loc = loginResp.headers["location"] as string | undefined;
  if (loc) {
    // #region debug-point C:redirect-branch
    reportDebug("C", "cas redirect branch entered", {
      traceId,
      locationHeader: loc.slice(0, 200),
      rewrittenForReauth: false,
    });
    // #endregion
    console.log("[CAS] 302:", loc.substring(0, 80));
    const finalResp = await httpRequest(loc, {
      headers: { Cookie: cookiesToHeader(cookies) },
      followRedirect: true,
    });
    // #region debug-point C:redirect-result
    reportDebug("C", "cas redirect chain completed", {
      statusCode: finalResp.statusCode,
      traceId,
      cookieNames: [...finalResp.cookies.keys()],
      hasGsSessionId: finalResp.cookies.has("GS_SESSIONID"),
      bodyHasPwdEncryptSalt: finalResp.body.includes("pwdEncryptSalt"),
      bodyHasAuthErrorKeyword: /error|失败|密码|账号|认证/i.test(finalResp.body),
      bodySnippet: finalResp.body.slice(0, 500),
    });
    // #endregion
    for (const [k, v] of finalResp.cookies) cookies.set(k, v);
  }

  // Step 4: 直接请求 URP 首页获取 session
  const urpResp = await httpRequest(serviceUrl, {
    headers: { Cookie: cookiesToHeader(cookies) },
    followRedirect: true,
  });
  // #region debug-point D:urp-session
  reportDebug("D", "urp landing response received", {
    statusCode: urpResp.statusCode,
    traceId,
    cookieNames: [...urpResp.cookies.keys()],
    hasGsSessionId: urpResp.cookies.has("GS_SESSIONID"),
    bodyHasPwdEncryptSalt: urpResp.body.includes("pwdEncryptSalt"),
    bodyHasHomeKeyword: /homeapp|我的应用|jwapp/i.test(urpResp.body),
    bodySnippet: urpResp.body.slice(0, 500),
  });
  // #endregion
  for (const [k, v] of urpResp.cookies) cookies.set(k, v);

  const cookieStr = [...cookies.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  const gs = cookies.get("GS_SESSIONID") || "";
  console.log("[CAS] GS_SESSIONID:", gs ? "已获取" : "未获取", "cookies:", [...cookies.keys()].join(", "));
  return { sessionCookie: gs, username, allCookies: cookieStr, targetBaseUrl };
}
