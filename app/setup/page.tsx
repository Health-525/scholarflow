"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { validateTokenFormat, verifyToken } from "@/lib/auth";
import { useAuthStore } from "@/store/auth";
import { secureStoreToken } from "@/lib/secure-auth";

export default function SetupPage() {
  const router = useRouter();
  const setToken = useAuthStore((s) => s.setToken);
  const [token, setTokenValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmed = token.trim();

    if (!validateTokenFormat(trimmed)) {
      setError("Token 格式无效，请输入以 ghp_ 或 github_pat_ 开头的 Token");
      return;
    }

    setIsLoading(true);
    try {
      const result = await verifyToken(trimmed);

      if (result.ok) {
        setToken(trimmed);
        await secureStoreToken(trimmed);
        router.replace("/");
        return;
      }

      if (result.reason === "invalid") {
        setError("Token 无效，请检查 Token 是否正确");
      } else if (result.reason === "insufficient_permissions") {
        setError("Token 权限不足，请确保已授予 repo 权限");
      } else {
        setError("网络不可达，请检查网络连接后重试");
      }
    } catch {
      setError("网络不可达，请检查网络连接后重试");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-md rounded-3xl p-8 bg-card border border-border dark:border-transparent shadow-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3" aria-hidden="true">
            📚
          </div>
          <h1 className="text-2xl font-bold mb-1 text-foreground">
            ScholarFlow
          </h1>
          <p className="text-sm text-muted-foreground">
            请输入 GitHub Personal Access Token 以开始使用
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="token-input"
              className="block text-sm font-medium mb-1.5 text-muted-foreground"
            >
              GitHub PAT
            </label>
            <input
              id="token-input"
              type="password"
              value={token}
              onChange={(e) => setTokenValue(e.target.value)}
              placeholder="ghp_ 或 github_pat_ 开头"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none bg-secondary border border-border dark:border-transparent text-foreground"
              aria-label="GitHub Personal Access Token"
              autoComplete="off"
              spellCheck={false}
              disabled={isLoading}
            />
          </div>

          {/* Error */}
          {error && (
            <div
              className="rounded-xl px-4 py-3 text-sm bg-red-500/8 border border-red-500/20 text-red-500"
              role="alert"
            >
              {error}
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={isLoading || !token.trim()}
            className={`w-full py-3 rounded-xl text-sm font-semibold transition-opacity bg-primary text-primary-foreground ${
              isLoading || !token.trim() ? "opacity-50" : ""
            }`}
            aria-label={isLoading ? "验证中" : "开始使用"}
          >
            {isLoading ? "验证中..." : "开始使用"}
          </button>
        </form>

        {/* Help text */}
        <div className="mt-6 text-center space-y-2">
          <p className="text-xs text-muted-foreground">
            Token 仅存储在本地浏览器中，不会上传到任何服务器
          </p>
          <a
            href="https://github.com/settings/tokens"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-xs transition-colors hover:underline text-primary"
          >
            如何创建 Token？→
          </a>
        </div>
      </div>
    </div>
  );
}
