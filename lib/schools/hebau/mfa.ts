import * as crypto from "crypto";
import * as http from "http";
import * as https from "https";

import { getServerDB } from "@/lib/server-db";

const CAS_URL = "https://cas.hebau.edu.cn";
const URP_URL = "http://urp.hebau.edu.cn:1009";
const SERVICE_URL = `${URP_URL}/jwapp/sys/homeapp/index.do`;
const MFA_TTL_MS = 10 * 60 * 1000;
const MFA_KEY_PREFIX = "hebau-mfa";
const AES_CHARS = "ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678";
const pendingMfaCleanupTimers = new Map<string, ReturnType<typeof setTimeout>>();

export const HEBEAU_MFA_REQUIRED_PREFIX = "MFA_REQUIRED::";

interface HttpResponse {
  statusCode: number;
  headers: Record<string, string | string[] | undefined>;
  body: string;
  cookies: Map<string, string>;
}

interface PendingHebauMfa {
  username: string;
  cookies: [string, string][];
  serviceUrl: string;
  reAuthType: string;
  isMultifactor: string;
  maskedTarget: string;
  createdAt: number;
}

export interface HebauLoginSession {
  username: string;
  cookie: string;
  sessionCookie: string;
}

function parseCookies(headers: string[]): Map<string, string> {
  const result = new Map<string, string>();
  for (const header of headers) {
    const eq = header.indexOf("=");
    if (eq > 0) result.set(header.substring(0, eq).trim(), header.split(";")[0].substring(eq + 1).trim());
  }
  return result;
}

function cookiesToHeader(cookies: Map<string, string>): string {
  return [...cookies.entries()].map(([key, value]) => `${key}=${value}`).join("; ");
}

function randStr(length: number): string {
  let result = "";
  for (let i = 0; i < length; i++) result += AES_CHARS[Math.floor(Math.random() * AES_CHARS.length)];
  return result;
}

function encryptPassword(password: string, salt: string): string {
  const plain = randStr(64) + password;
  const key = Buffer.from(salt.trim(), "utf-8");
  const iv = Buffer.from(randStr(16), "utf-8");
  const cipher = crypto.createCipheriv("aes-128-cbc", key, iv);
  cipher.setAutoPadding(true);
  return Buffer.concat([cipher.update(plain, "utf-8"), cipher.final()]).toString("base64");
}

function challengeKey(challengeId: string): string {
  return `${MFA_KEY_PREFIX}:${challengeId}`;
}

function clearPendingHebauMfaTimer(challengeId: string): void {
  const timer = pendingMfaCleanupTimers.get(challengeId);
  if (!timer) return;
  clearTimeout(timer);
  pendingMfaCleanupTimers.delete(challengeId);
}

function schedulePendingHebauMfaTimer(challengeId: string, createdAt: number): void {
  clearPendingHebauMfaTimer(challengeId);
  const delayMs = Math.max(0, createdAt + MFA_TTL_MS - Date.now());
  const timer = setTimeout(() => {
    pendingMfaCleanupTimers.delete(challengeId);
    getServerDB().deleteData(challengeKey(challengeId));
  }, delayMs);
  timer.unref?.();
  pendingMfaCleanupTimers.set(challengeId, timer);
}

function isPendingHebauMfa(value: unknown): value is PendingHebauMfa {
  if (!value || typeof value !== "object") return false;
  const pending = value as Partial<PendingHebauMfa>;
  return (
    typeof pending.username === "string" &&
    Array.isArray(pending.cookies) &&
    typeof pending.serviceUrl === "string" &&
    typeof pending.reAuthType === "string" &&
    typeof pending.isMultifactor === "string" &&
    typeof pending.maskedTarget === "string" &&
    typeof pending.createdAt === "number"
  );
}

function cleanupPendingHebauMfa(username?: string): void {
  const db = getServerDB();
  if (typeof db.listKeys !== "function") return;
  const now = Date.now();
  for (const key of db.listKeys()) {
    if (!key.startsWith(`${MFA_KEY_PREFIX}:`)) continue;
    const challengeId = key.slice(`${MFA_KEY_PREFIX}:`.length);
    const value = db.readData(key);
    if (!isPendingHebauMfa(value)) {
      clearPendingHebauMfaTimer(challengeId);
      db.deleteData(key);
      continue;
    }
    if (now - value.createdAt > MFA_TTL_MS || (username && value.username === username)) {
      clearPendingHebauMfaTimer(challengeId);
      db.deleteData(key);
      continue;
    }
    schedulePendingHebauMfaTimer(challengeId, value.createdAt);
  }
}

export function deleteHebauMfaChallenge(challengeId: string): void {
  clearPendingHebauMfaTimer(challengeId);
  getServerDB().deleteData(challengeKey(challengeId));
}

function extractJsonString(html: string, key: string): string {
  return html.match(new RegExp(`"${key}":"([^"]*)"`, "i"))?.[1] || "";
}

function extractMaskedTarget(html: string): string {
  return html.match(/value="[^"]*\(([^)]+)\)"/)?.[1] || "";
}

function mapReAuthTypeToAuthCodeTypeName(reAuthType: string): string | null {
  const mapping: Record<string, string> = {
    "3": "reAuthDynamicCodeType",
    "4": "reAuthWChatDynamicCodeType",
    "5": "reAuthCpdailyDynamicCodeType",
    "11": "reAuthEmailDynamicCodeType",
    "12": "reAuthDingTalkDynamicCodeType",
    "13": "reAuthWeLinkDynamicCodeType",
  };
  return mapping[reAuthType] || null;
}

function parseJsonBody<T>(body: string): T | null {
  try {
    return JSON.parse(body) as T;
  } catch {
    return null;
  }
}

function buildMfaRequiredError(challengeId: string, maskedTarget: string): Error {
  return new Error(`${HEBEAU_MFA_REQUIRED_PREFIX}${challengeId}::${maskedTarget}`);
}

function upsertCookies(target: Map<string, string>, source: Map<string, string>) {
  for (const [key, value] of source) target.set(key, value);
}

function httpRequest(url: string, opts?: {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  followRedirect?: boolean;
  maxRedirects?: number;
  _cookies?: Map<string, string>;
}): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    const { method = "GET", headers = {}, body, followRedirect = true, maxRedirects = 10, _cookies } = opts || {};
    const parsedUrl = new URL(url);
    const transport = parsedUrl.protocol === "https:" ? https : http;
    const reqCookies = new Map(_cookies || []);

    if (headers.Cookie) {
      for (const part of headers.Cookie.split(";")) {
        const eq = part.indexOf("=");
        if (eq > 0) reqCookies.set(part.substring(0, eq).trim(), part.substring(eq + 1).trim());
      }
    }

    const requestHeaders: Record<string, string> = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      Accept: "text/html,application/xhtml+xml,*/*",
      "Accept-Language": "zh-CN,zh;q=0.9",
      ...headers,
    };
    if (reqCookies.size > 0) requestHeaders.Cookie = cookiesToHeader(reqCookies);

    const req = transport.request({
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === "https:" ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method,
      headers: requestHeaders,
    }, (res) => {
      if (followRedirect && res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && maxRedirects > 0) {
        const merged = new Map(reqCookies);
        const setCookie = res.headers["set-cookie"];
        if (setCookie) upsertCookies(merged, parseCookies(Array.isArray(setCookie) ? setCookie : [setCookie]));
        httpRequest(new URL(res.headers.location, url).toString(), {
          ...opts,
          headers: {},
          maxRedirects: maxRedirects - 1,
          _cookies: merged,
        }).then(resolve).catch(reject);
        return;
      }

      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => chunks.push(chunk));
      res.on("end", () => {
        const responseBody = Buffer.concat(chunks).toString("utf-8");
        const merged = new Map(reqCookies);
        const setCookie = res.headers["set-cookie"];
        if (setCookie) upsertCookies(merged, parseCookies(Array.isArray(setCookie) ? setCookie : [setCookie]));
        resolve({
          statusCode: res.statusCode || 0,
          headers: res.headers as Record<string, string | string[] | undefined>,
          body: responseBody,
          cookies: merged,
        });
      });
    });

    req.on("error", reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error("请求河北农大统一认证超时"));
    });
    if (body) req.write(body);
    req.end();
  });
}

async function finalizeUrpSession(cookies: Map<string, string>): Promise<HebauLoginSession> {
  const response = await httpRequest(`${CAS_URL}/authserver/login?service=${encodeURIComponent(SERVICE_URL)}`, {
    headers: { Cookie: cookiesToHeader(cookies) },
    followRedirect: true,
  });
  const sessionCookie = response.cookies.get("GS_SESSIONID") || "";
  if (!sessionCookie) throw new Error("河北农大已完成认证，但未获取到教务系统会话");
  return {
    username: "",
    cookie: cookiesToHeader(response.cookies),
    sessionCookie,
  };
}

export async function loginHebauWithMfa(credentials: Record<string, string>): Promise<HebauLoginSession> {
  const { username, password, challengeId, dynamicCode } = credentials;
  if (!username || !password) throw new Error("请输入学号和密码");

  if (challengeId && dynamicCode) {
    return completeHebauMfaChallenge(challengeId, dynamicCode, username);
  }

  cleanupPendingHebauMfa(username.trim());

  const loginPage = await httpRequest(`${CAS_URL}/authserver/login?service=${encodeURIComponent(SERVICE_URL)}`);
  const execution = loginPage.body.match(/name="execution"\s+value="([^"]*)"/)?.[1] || "";
  const salt = loginPage.body.match(/id="pwdEncryptSalt"\s+value="([^"]*)"/)?.[1] || "";
  if (!execution) throw new Error("无法获取河北农大登录参数");

  const cookies = new Map(loginPage.cookies);
  const body = new URLSearchParams({
    username,
    passwordText: password,
    password: encryptPassword(password, salt),
    execution,
    _eventId: "submit",
    lt: "",
    cllt: "userNameLogin",
    dllt: "generalLogin",
    rememberMe: "true",
    service: SERVICE_URL,
  }).toString();

  const loginResp = await httpRequest(`${CAS_URL}/authserver/login?service=${encodeURIComponent(SERVICE_URL)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookiesToHeader(cookies),
    },
    body,
    followRedirect: false,
  });
  upsertCookies(cookies, loginResp.cookies);

  if (loginResp.body.includes("pwdEncryptSalt")) {
    throw new Error("学号或密码不正确");
  }

  const redirectLocation = typeof loginResp.headers.location === "string" ? loginResp.headers.location : "";
  if (redirectLocation.includes("/reAuthCheck/")) {
    const reAuthResp = await httpRequest(redirectLocation, {
      headers: { Cookie: cookiesToHeader(cookies) },
      followRedirect: false,
    });
    upsertCookies(cookies, reAuthResp.cookies);

    const reAuthType = extractJsonString(reAuthResp.body, "reAuthType");
    const isMultifactor = extractJsonString(reAuthResp.body, "isMultifactor") || "true";
    const maskedTarget = extractMaskedTarget(reAuthResp.body);
    const authCodeTypeName = mapReAuthTypeToAuthCodeTypeName(reAuthType);
    if (!authCodeTypeName) {
      throw new Error("当前河北农大触发了暂不支持的二次认证方式");
    }

    const sendCodeResp = await httpRequest(`${CAS_URL}/authserver/dynamicCode/getDynamicCodeByReauth.do`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "X-Requested-With": "XMLHttpRequest",
        Referer: redirectLocation,
        Cookie: cookiesToHeader(cookies),
      },
      body: new URLSearchParams({
        userName: username,
        authCodeTypeName,
      }).toString(),
      followRedirect: false,
    });
    upsertCookies(cookies, sendCodeResp.cookies);

    const sendCodeData = parseJsonBody<{ res?: string; returnMessage?: string }>(sendCodeResp.body);
    if (!sendCodeData || (sendCodeData.res !== "success" && sendCodeData.res !== "wechat_success" && sendCodeData.res !== "cpdaily_success")) {
      throw new Error(sendCodeData?.returnMessage || "河北农大发送验证码失败");
    }

    const newChallengeId = crypto.randomUUID();
    const db = getServerDB();
    db.writeData(challengeKey(newChallengeId), {
      username,
      cookies: [...cookies.entries()],
      serviceUrl: SERVICE_URL,
      reAuthType,
      isMultifactor,
      maskedTarget,
      createdAt: Date.now(),
    } satisfies PendingHebauMfa);
    schedulePendingHebauMfaTimer(newChallengeId, Date.now());
    throw buildMfaRequiredError(newChallengeId, maskedTarget);
  }

  const finalSession = await finalizeUrpSession(cookies);
  return { ...finalSession, username };
}

export async function completeHebauMfaChallenge(
  challengeId: string,
  dynamicCode: string,
  username: string
): Promise<HebauLoginSession> {
  cleanupPendingHebauMfa();
  const db = getServerDB();
  const pending = db.readData(challengeKey(challengeId)) as PendingHebauMfa | null;
  if (!pending) throw new Error("河北农大验证码会话已失效，请重新登录");
  if (Date.now() - pending.createdAt > MFA_TTL_MS) {
    db.deleteData(challengeKey(challengeId));
    throw new Error("河北农大验证码已过期，请重新发送");
  }
  if (pending.username !== username.trim()) {
    db.deleteData(challengeKey(challengeId));
    throw new Error("河北农大验证码会话与当前账号不匹配，请重新登录");
  }

  const cookies = new Map(pending.cookies);
  const submitResp = await httpRequest(`${CAS_URL}/authserver/reAuthCheck/reAuthSubmit.do`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "X-Requested-With": "XMLHttpRequest",
      Referer: `${CAS_URL}/authserver/reAuthCheck/reAuthLoginView.do?isMultifactor=true&service=${encodeURIComponent(pending.serviceUrl)}`,
      Cookie: cookiesToHeader(cookies),
    },
    body: new URLSearchParams({
      service: pending.serviceUrl,
      reAuthType: pending.reAuthType,
      isMultifactor: pending.isMultifactor,
      dynamicCode,
      skipTmpReAuth: "false",
    }).toString(),
    followRedirect: false,
  });
  upsertCookies(cookies, submitResp.cookies);

  const submitData = parseJsonBody<{ code?: string; msg?: string }>(submitResp.body);
  if (!submitData || submitData.code !== "reAuth_success") {
    throw new Error(submitData?.msg || "河北农大验证码校验失败");
  }

  const finalSession = await finalizeUrpSession(cookies);
  db.deleteData(challengeKey(challengeId));
  return { ...finalSession, username: pending.username };
}

cleanupPendingHebauMfa();
