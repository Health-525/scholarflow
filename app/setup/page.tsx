"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { verifyToken } from "@/lib/auth";
import { setupTokenSchema, type SetupTokenInput } from "@/lib/schemas";
import { secureStoreToken } from "@/lib/secure-auth";
import { useAuthStore } from "@/store/auth";

export default function SetupPage() {
  const router = useRouter();
  const setToken = useAuthStore((s) => s.setToken);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SetupTokenInput>({
    resolver: zodResolver(setupTokenSchema),
    defaultValues: { token: "" },
  });

  async function onSubmit(data: SetupTokenInput) {
    setSubmitError(null);
    const trimmed = data.token.trim();

    const result = await verifyToken(trimmed);

    if (result.ok) {
      setToken(trimmed);
      await secureStoreToken(trimmed);
      router.replace("/");
      return;
    }

    if (result.reason === "invalid") {
      setSubmitError("Token 无效，请检查 Token 是否正确");
    } else if (result.reason === "insufficient_permissions") {
      setSubmitError("Token 权限不足，请确保已授予 repo 权限");
    } else {
      setSubmitError("网络不可达，请检查网络连接后重试");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-md rounded-3xl p-8 bg-card border border-border shadow-lg">
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
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
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
              placeholder="ghp_ 或 github_pat_ 开头"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none bg-secondary border border-border text-foreground disabled:opacity-50"
              aria-label="GitHub Personal Access Token"
              aria-invalid={errors.token ? "true" : "false"}
              aria-describedby={errors.token ? "token-error" : undefined}
              autoComplete="off"
              spellCheck={false}
              disabled={isSubmitting}
              {...register("token")}
            />
            {errors.token && (
              <p id="token-error" className="mt-1.5 text-xs text-red-500" role="alert">
                {errors.token.message}
              </p>
            )}
          </div>

          {/* Error */}
          {submitError && (
            <div
              className="rounded-xl px-4 py-3 text-sm bg-red-500/8 border border-red-500/20 text-red-500"
              role="alert"
            >
              {submitError}
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-3 rounded-xl text-sm font-semibold transition-opacity bg-primary text-primary-foreground ${
              isSubmitting ? "opacity-50" : ""
            }`}
            aria-label={isSubmitting ? "验证中" : "开始使用"}
          >
            {isSubmitting ? "验证中..." : "开始使用"}
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
