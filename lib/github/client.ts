import { githubCache } from "./cache";
import { toGitHubError, GitHubError } from "./errors";
import { REPOS } from "./repos";
import type { GitHubRepo, FileContent, DirectoryEntry } from "@/types";

const TIMEOUT_MS = 10_000;
const MAX_RATE_LIMIT_RETRIES = 3;

export interface GitHubClientOptions {
  token: string;
  repos?: { content: string; execution: string };
}

function withTimeout(signal?: AbortSignal): { signal: AbortSignal; cleanup: () => void } {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  // Combine with external signal if provided
  if (signal) {
    signal.addEventListener("abort", () => controller.abort());
  }

  return {
    signal: controller.signal,
    cleanup: () => clearTimeout(timeoutId),
  };
}

function repoUrl(repoFullName: string, path: string): string {
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  return `https://api.github.com/repos/${repoFullName}/contents/${cleanPath}`;
}

function cacheKey(repo: GitHubRepo, path: string): string {
  return `${repo}:${path}`;
}

export class GitHubClient {
  private token: string;
  private repos: { content: string; execution: string };

  constructor(options: GitHubClientOptions) {
    this.token = options.token;
    this.repos = options.repos ?? REPOS;
  }

  private authHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
      Accept: "application/vnd.github.v3+json",
      "X-GitHub-Api-Version": "2022-11-28",
    };
  }

  private repoName(repo: GitHubRepo): string {
    return this.repos[repo];
  }

  async getFile(repo: GitHubRepo, path: string): Promise<FileContent> {
    const key = cacheKey(repo, path);
    const cached = githubCache.get<FileContent>(key);
    if (cached) return cached;

    let retries = 0;

    while (true) {
      const { signal, cleanup } = withTimeout();
      try {
        const url = repoUrl(this.repoName(repo), path);
        const resp = await fetch(url, { headers: this.authHeaders(), signal });
        cleanup();

        if (resp.status === 429 && retries < MAX_RATE_LIMIT_RETRIES) {
          const retryAfter = parseInt(resp.headers.get("Retry-After") ?? "60", 10);
          await sleep((retryAfter || 60) * 1000);
          retries++;
          continue;
        }

        if (!resp.ok) {
          throw toGitHubError(resp);
        }

        const data = await resp.json();
        // GitHub API 返回的是 UTF-8 文件内容的 Base64 编码
        // atob 只能解码为 Latin-1 字节串，中文会乱码
        // 需要先转为 Uint8Array，再用 TextDecoder 按 UTF-8 解码
        const rawBase64 = data.content.replace(/\n/g, "");
        const binaryStr = atob(rawBase64);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        const content = new TextDecoder("utf-8").decode(bytes);
        const result: FileContent = { content, sha: data.sha, path: data.path };

        githubCache.set(key, result);
        return result;
      } catch (err) {
        cleanup();
        if ((err as GitHubError).type) throw err;
        throw toGitHubError(err);
      }
    }
  }

  async listDirectory(repo: GitHubRepo, path: string): Promise<DirectoryEntry[]> {
    const key = cacheKey(repo, path) + ":dir";
    const cached = githubCache.get<DirectoryEntry[]>(key);
    if (cached) return cached;

    const { signal, cleanup } = withTimeout();
    try {
      const url = repoUrl(this.repoName(repo), path);
      const resp = await fetch(url, { headers: this.authHeaders(), signal });
      cleanup();

      if (!resp.ok) {
        throw toGitHubError(resp);
      }

      const data = await resp.json();
      const entries: DirectoryEntry[] = Array.isArray(data)
        ? data.map((item: { name: string; path: string; type: string }) => ({
            name: item.name,
            path: item.path,
            type: item.type as "file" | "dir",
          }))
        : [];

      githubCache.set(key, entries);
      return entries;
    } catch (err) {
      cleanup();
      if ((err as GitHubError).type) throw err;
      throw toGitHubError(err);
    }
  }

  async putFile(
    repo: GitHubRepo,
    path: string,
    content: string,
    action: string
  ): Promise<void> {
    const doWrite = async (sha: string): Promise<Response> => {
      const { signal, cleanup } = withTimeout();
      try {
        const url = repoUrl(this.repoName(repo), path);
        const message = `[ScholarFlow] ${action} · ${new Date().toISOString()}`;
        const body = {
          message,
          content: btoa(unescape(encodeURIComponent(content))),
          sha,
        };
        const resp = await fetch(url, {
          method: "PUT",
          headers: { ...this.authHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal,
        });
        cleanup();
        return resp;
      } catch (err) {
        cleanup();
        throw toGitHubError(err);
      }
    };

    // Step 1: GET current sha
    let sha: string;
    try {
      const existing = await this.getFile(repo, path);
      sha = existing.sha;
    } catch (err) {
      // If file doesn't exist (404), use empty sha
      if ((err as GitHubError).type === "not_found") {
        sha = "";
      } else {
        throw err;
      }
    }

    // Step 2: PUT with sha
    let resp = await doWrite(sha);

    // Step 3: If conflict (409), retry once with fresh sha
    if (resp.status === 409) {
      // Invalidate cache and re-fetch
      this.invalidateCache(repo, path);
      try {
        const refreshed = await this.getFile(repo, path);
        sha = refreshed.sha;
      } catch {
        sha = "";
      }
      resp = await doWrite(sha);
    }

    if (!resp.ok) {
      throw toGitHubError(resp);
    }

    // Invalidate cache after successful write
    this.invalidateCache(repo, path);
  }

  invalidateCache(repo: GitHubRepo, path: string): void {
    const key = cacheKey(repo, path);
    githubCache.invalidate(key);
    githubCache.invalidate(key + ":dir");
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
