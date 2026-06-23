import http from "http";
import https from "https";

import type { NewsItem } from "../types";

const BASE_URL = "https://jiaowu.hebau.edu.cn";

const TARGETS = [
  { category: "通知公告", url: `${BASE_URL}/index/tzgg.htm` },
  { category: "教务动态", url: `${BASE_URL}/index/jwdt.htm` },
] as const;

function decodeHtml(buffer: Buffer, contentType: string | string[] | undefined): string {
  const header = Array.isArray(contentType) ? contentType.join(";") : contentType || "";
  const ascii = buffer.toString("latin1");
  const headerCharset = header.match(/charset=([\w-]+)/i)?.[1]?.toLowerCase();
  const metaCharset = ascii.match(/<meta[^>]+charset=["']?\s*([\w-]+)/i)?.[1]?.toLowerCase();
  const charset = headerCharset || metaCharset || "utf-8";
  const encoding = /gbk|gb2312|gb18030/i.test(charset) ? "gb18030" : "utf-8";
  return new TextDecoder(encoding).decode(buffer);
}

function fetchHtml(url: string, timeout = 15000): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    const req = client.get(
      url,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "zh-CN,zh;q=0.9",
          Connection: "keep-alive",
        },
      },
      (res) => {
        if ((res.statusCode ?? 0) >= 300 && (res.statusCode ?? 0) < 400 && res.headers.location) {
          const redirectUrl = res.headers.location.startsWith("http")
            ? res.headers.location
            : new URL(res.headers.location, url).href;
          fetchHtml(redirectUrl, timeout).then(resolve).catch(reject);
          return;
        }

        if ((res.statusCode ?? 0) < 200 || (res.statusCode ?? 0) >= 400) {
          reject(new Error(`HTTP ${res.statusCode ?? 0} for ${url}`));
          return;
        }

        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          resolve(decodeHtml(Buffer.concat(chunks), res.headers["content-type"]));
        });
        res.on("error", reject);
      }
    );

    req.setTimeout(timeout, () => req.destroy(new Error(`Timeout ${url}`)));
    req.on("error", reject);
  });
}

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'");
}

function cleanText(text: string): string {
  return decodeEntities(text.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

export function parseHebauJwcNewsList(
  html: string,
  baseUrl: string,
  category: string
): NewsItem[] {
  const listMatch = html.match(/<div[^>]*class="[^"]*\binn_com\b[^"]*\bmtsj\b[^"]*"[^>]*>[\s\S]*?<ul>([\s\S]*?)<\/ul>/i);
  if (!listMatch) return [];

  const items: NewsItem[] = [];
  const itemRegex =
    /<li[^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>[\s\S]*?<span>(\d{1,2})<\/span>\s*<p>(\d{4}\.\d{2})<\/p>[\s\S]*?<h2[^>]*class="[^"]*\bl1\b[^"]*"[^>]*>([\s\S]*?)<\/h2>/gi;

  let match: RegExpExecArray | null;
  while ((match = itemRegex.exec(listMatch[1])) !== null) {
    const url = new URL(match[1], baseUrl).href;
    const day = match[2].padStart(2, "0");
    const month = match[3].replace(".", "-");
    const title = cleanText(match[4]);
    if (!title) continue;

    items.push({
      title,
      url,
      date: `${month}-${day}`,
      category,
    });
  }

  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
}

export async function fetchJwcNews(existingItems: NewsItem[] = []): Promise<NewsItem[]> {
  const latestItems = (
    await Promise.all(
      TARGETS.map(async ({ category, url }) => {
        try {
          const html = await fetchHtml(url);
          return parseHebauJwcNewsList(html, url, category);
        } catch {
          return [];
        }
      })
    )
  ).flat();

  if (latestItems.length === 0) return existingItems;

  const merged = [
    ...latestItems,
    ...existingItems.filter((existing) => !latestItems.some((item) => item.url === existing.url)),
  ];

  merged.sort((a, b) => b.date.localeCompare(a.date));
  return merged.slice(0, 5);
}
