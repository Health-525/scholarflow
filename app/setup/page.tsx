"use client";

import { GraduationCap, KeyRound, Loader2, ArrowLeft, CheckCircle2, XCircle, BookOpen, ShieldCheck, Eye, EyeClosed } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { isElectron, isSecureStorageAvailable, rememberPasswordSupported } from "@/lib/runtime-env";
import { getAllSchools } from "@/lib/schools/catalog";
import type { SchoolCatalogItem } from "@/lib/schools/catalog";
import { cn } from "@/lib/utils";
import { APP_VERSION } from "@/lib/version";
import { useAuthStore } from "@/store/auth";

type Step = "select-school" | "enter-credentials" | "enter-mfa" | "loading-data";

interface FetchStatus {
  key: string;
  label: string;
  icon: React.ReactNode;
  status: "pending" | "loading" | "done" | "error";
  message?: string;
}

export default function SetupPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const schools = getAllSchools();

  const [step, setStep] = useState<Step>("select-school");
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>(schools[0]?.id || "");
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [loginError, setLoginError] = useState<string | null>(null);
  const [fetchStatuses, setFetchStatuses] = useState<FetchStatus[]>([]);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [revealedFields, setRevealedFields] = useState<Record<string, boolean>>({});
  const [rememberSupported, setRememberSupported] = useState(false);
  const [rememberChecked, setRememberChecked] = useState(false);
  const [mfaChallengeId, setMfaChallengeId] = useState("");
  const [mfaMaskedTarget, setMfaMaskedTarget] = useState("");
  const [mfaCode, setMfaCode] = useState("");

  const selectedSchool = schools.find((s) => s.id === selectedSchoolId) as SchoolCatalogItem | undefined;

  useEffect(() => {
    if (selectedSchoolId) setCredentials({});
  }, [selectedSchoolId]);

  // Detect whether "remember password" is supported in the current runtime form.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const electron = isElectron();
      const secure = await isSecureStorageAvailable();
      if (!cancelled) setRememberSupported(rememberPasswordSupported({ electron, secure }));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Step 1: Select School ──────────────────────────────────

  function handleSelectSchool() {
    if (!selectedSchoolId) return;
    setStep("enter-credentials");
    setLoginError(null);
  }

  // ── Step 2: Enter Credentials ──────────────────────────────

  async function handleLogin() {
    setLoginError(null);
    setIsLoggingIn(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolId: selectedSchoolId, credentials, remember: rememberChecked }),
      });

      const data = await res.json();

      if (data.requiresMfa) {
        setMfaChallengeId(data.challengeId || "");
        setMfaMaskedTarget(data.maskedTarget || "");
        setMfaCode("");
        setStep("enter-mfa");
        setIsLoggingIn(false);
        return;
      }

      if (!res.ok || data.error) {
        setLoginError(data.error || "登录失败，请检查学号和密码");
        setIsLoggingIn(false);
        return;
      }

      // Persist the password via OS-level encrypted storage when remembering is
      // supported, opted-in, and a password is present. Best-effort: failures
      // here must not block entering the app.
      if (rememberSupported && rememberChecked && credentials.password) {
        try {
          await window.electronAPI?.storeCredential?.(credentials.password);
        } catch {
          // ignore — login itself succeeded; remembered password is optional
        }
      }

      setAuth(data.schoolId, data.userId || credentials.username || "");
      setStep("loading-data");
      startDataFetch(data.schoolId, credentials);
    } catch (e) {
      setLoginError(e instanceof Error ? e.message : "网络连接失败");
      setIsLoggingIn(false);
    }
  }

  async function handleMfaLogin() {
    setLoginError(null);
    setIsLoggingIn(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId: selectedSchoolId,
          credentials: {
            ...credentials,
            challengeId: mfaChallengeId,
            dynamicCode: mfaCode,
          },
          remember: rememberChecked,
        }),
      });

      const data = await res.json();

      if (data.requiresMfa) {
        setMfaChallengeId(data.challengeId || "");
        setMfaMaskedTarget(data.maskedTarget || mfaMaskedTarget);
        setMfaCode("");
        setIsLoggingIn(false);
        return;
      }

      if (!res.ok || data.error) {
        setLoginError(data.error || "验证码校验失败");
        setIsLoggingIn(false);
        return;
      }

      if (rememberSupported && rememberChecked && credentials.password) {
        try {
          await window.electronAPI?.storeCredential?.(credentials.password);
        } catch {
          // ignore — login itself succeeded; remembered password is optional
        }
      }

      setAuth(data.schoolId, data.userId || credentials.username || "");
      setStep("loading-data");
      startDataFetch(data.schoolId, credentials);
    } catch (e) {
      setLoginError(e instanceof Error ? e.message : "网络连接失败");
      setIsLoggingIn(false);
    }
  }

  // ── Step 3: Data Loading ───────────────────────────────────

  async function startDataFetch(schoolId: string, creds: Record<string, string>) {
    const statuses: FetchStatus[] = [
      { key: "all", label: "教务数据", icon: <BookOpen className="w-4 h-4" />, status: "loading" },
    ];
    setFetchStatuses(statuses);

    try {
      const res = await fetch("/api/fetch/all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId,
          cookie: creds.cookie || "",
          username: creds.username || "",
        }),
      });

      const data = await res.json();

      if (data.ok) {
        const results = data.results || {};
        setFetchStatuses([
          { key: "schedule", label: "课表", icon: <BookOpen className="w-4 h-4" />, status: "done", message: results.schedule },
          { key: "exams", label: "考试安排", icon: <GraduationCap className="w-4 h-4" />, status: "done", message: results.exams },
          { key: "grades", label: "成绩", icon: <ShieldCheck className="w-4 h-4" />, status: "done", message: results.grades },
          { key: "jwcNews", label: "教务通知", icon: <BookOpen className="w-4 h-4" />, status: "done", message: results.jwcNews },
        ]);
      } else {
        setFetchStatuses([
          { key: "all", label: "教务数据", icon: <BookOpen className="w-4 h-4" />, status: "error", message: data.error },
        ]);
      }
    } catch (e) {
      setFetchStatuses([
        { key: "all", label: "教务数据", icon: <BookOpen className="w-4 h-4" />, status: "error", message: e instanceof Error ? e.message : "网络错误" },
      ]);
    }
  }

  function handleEnterApp() {
    router.replace("/");
  }

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background relative overflow-hidden">
      {/* Background decoration — matching dashboard hero style */}
      <div className="relative w-full max-w-[420px]">
        {/* Card container */}
        <Card className="rounded-3xl bg-card/80 backdrop-blur-xl shadow-md p-8 space-y-6">

          {/* ── Step 1: Select School ─────────────────────────── */}
          {step === "select-school" && (
            <>
              {/* Brand header */}
              <div className="text-center space-y-3">
                <div className="relative mx-auto w-16 h-16">
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-card/75 backdrop-blur-xl shadow-sm">
                    <GraduationCap className="w-8 h-8 text-primary" strokeWidth={1.5} />
                  </div>
                </div>
                <h1 className="text-3xl font-bold font-display text-foreground tracking-tight">
                  ScholarFlow
                </h1>
                <p className="text-sm text-muted-foreground">
                  你的独立学习管理中枢
                </p>
              </div>

              {/* School selector */}
              <div className="space-y-3">
                <span className="block text-xs font-medium text-muted-foreground">
                  选择学校
                </span>
                <div className="space-y-2" role="radiogroup" aria-label="选择学校">
                  {schools.map((s) => (
                    <Button
                      key={s.id}
                      type="button"
                      role="radio"
                      aria-checked={selectedSchoolId === s.id}
                      variant="outline"
                      onClick={() => setSelectedSchoolId(s.id)}
                      className={cn(
                        "w-full justify-start gap-3 px-4 py-3 h-auto rounded-xl text-sm font-medium",
                        "border-border/60 bg-secondary/40 hover:bg-secondary/80",
                        selectedSchoolId === s.id
                          ? "border-primary/40 bg-primary/8 ring-2 ring-primary/20 text-foreground"
                          : "text-muted-foreground"
                      )}
                    >
                      <GraduationCap className={cn(
                        "w-4 h-4 shrink-0",
                        selectedSchoolId === s.id ? "text-primary" : "text-muted-foreground"
                      )} />
                      <span>{s.name}</span>
                      {selectedSchoolId === s.id && (
                        <CheckCircle2 className="w-4 h-4 text-primary ml-auto shrink-0" />
                      )}
                    </Button>
                  ))}
                  {schools.length === 0 && (
                    <div className="text-center py-4 text-sm text-muted-foreground">
                      暂无可用学校
                    </div>
                  )}
                </div>
              </div>

              {/* Continue button */}
              <Button
                type="button"
                onClick={handleSelectSchool}
                disabled={!selectedSchoolId}
                className="w-full h-10 rounded-xl text-sm font-semibold"
              >
                继续
              </Button>

              <p className="text-center text-xs text-muted-foreground/50">
                更多学校即将支持
              </p>
            </>
          )}

          {/* ── Step 2: Enter Credentials ─────────────────────── */}
          {step === "enter-credentials" && (
            <>
              {/* School header */}
              <div className="text-center space-y-2">
                <div className="relative mx-auto w-12 h-12">
                  <div className="absolute inset-0 rounded-2xl bg-primary/10 blur-xl" aria-hidden="true" />
                  <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-card/75 backdrop-blur-xl shadow-sm">
                    <KeyRound className="w-5 h-5 text-primary" strokeWidth={1.5} />
                  </div>
                </div>
                <h1 className="text-2xl font-bold font-display text-foreground tracking-tight">
                  {selectedSchool?.name || selectedSchoolId}
                </h1>
                <p className="text-sm text-muted-foreground">
                  输入教务系统凭证以获取数据
                </p>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }} className="space-y-4">
                {selectedSchool?.loginFields.map((field) => {
                  const isPassword = field.type === "password";
                  const isRevealed = revealedFields[field.key];
                  const inputType = isPassword && isRevealed ? "text" : field.type;
                  return (
                    <div key={field.key} className="space-y-1.5">
                      <label htmlFor={field.key} className="block text-xs font-medium text-muted-foreground">
                        {field.label}
                      </label>
                      <div className="relative">
                        <Input
                          id={field.key}
                          type={inputType}
                          placeholder={field.placeholder || ""}
                          value={credentials[field.key] || ""}
                          onChange={(e) => setCredentials({ ...credentials, [field.key]: e.target.value })}
                          className={cn(
                            "h-10 px-4 rounded-xl text-sm bg-secondary/50 border-border/60 text-foreground placeholder:text-muted-foreground/40 focus-visible:border-primary/40 focus-visible:ring-primary/20",
                            isPassword && "pr-11"
                          )}
                          required={field.required}
                        />
                        {isPassword && (
                          <button
                            type="button"
                            onClick={() => setRevealedFields((prev) => ({ ...prev, [field.key]: !prev[field.key] }))}
                            aria-label={isRevealed ? "隐藏密码" : "显示密码"}
                            aria-pressed={isRevealed}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground/60 hover:text-foreground hover:bg-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:bg-secondary"
                          >
                            {isRevealed ? <Eye className="w-4 h-4" /> : <EyeClosed className="w-4 h-4" />}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Remember password */}
                {rememberSupported ? (
                  <div className="space-y-1">
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rememberChecked}
                        onChange={(e) => setRememberChecked(e.target.checked)}
                        className="h-4 w-4 shrink-0 rounded border-border/60 bg-secondary/50 text-primary accent-primary focus-visible:ring-2 focus-visible:ring-primary/20"
                      />
                      <span className="text-sm text-foreground">记住密码</span>
                    </label>
                    <p className="pl-[26px] text-xs text-muted-foreground/50 leading-relaxed">
                      密码将加密存储在本地，仅用于自动更新
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground/40 leading-relaxed">
                    当前形态不支持记住密码
                  </p>
                )}

                {/* Error message */}
                {loginError && (
                  <div className="rounded-xl px-4 py-3 text-sm bg-[var(--callout-danger-bg)] border border-destructive/20 text-destructive flex items-center gap-2" role="alert">
                    <XCircle className="w-4 h-4 shrink-0" />
                    <span>{loginError}</span>
                  </div>
                )}

                {/* Submit button */}
                <Button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full h-10 rounded-xl text-sm font-semibold gap-2"
                >
                  {isLoggingIn ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      正在登录...
                    </>
                  ) : (
                    "登录"
                  )}
                </Button>

                {/* Back button */}
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => { setStep("select-school"); setLoginError(null); }}
                  className="w-full h-auto py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  返回选择学校
                </Button>
              </form>

              {/* Security note */}
              <p className="text-center text-xs text-muted-foreground/40 leading-relaxed">
                密码仅用于本地获取数据，不会上传至任何服务器
              </p>
            </>
          )}

          {step === "enter-mfa" && (
            <>
              <div className="text-center space-y-2">
                <div className="relative mx-auto w-12 h-12">
                  <div className="absolute inset-0 rounded-2xl bg-primary/10 blur-xl" aria-hidden="true" />
                  <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-card/75 backdrop-blur-xl shadow-sm">
                    <ShieldCheck className="w-5 h-5 text-primary" strokeWidth={1.5} />
                  </div>
                </div>
                <h1 className="text-2xl font-bold font-display text-foreground tracking-tight">
                  二次认证
                </h1>
                <p className="text-sm text-muted-foreground">
                  已向 {mfaMaskedTarget || "已绑定手机号"} 发送验证码
                </p>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleMfaLogin(); }} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="mfaCode" className="block text-xs font-medium text-muted-foreground">
                    验证码
                  </label>
                  <Input
                    id="mfaCode"
                    type="text"
                    inputMode="numeric"
                    placeholder="请输入短信验证码"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value)}
                    className="h-10 px-4 rounded-xl text-sm bg-secondary/50 border-border/60 text-foreground placeholder:text-muted-foreground/40 focus-visible:border-primary/40 focus-visible:ring-primary/20"
                    required
                  />
                </div>

                {loginError && (
                  <div className="rounded-xl px-4 py-3 text-sm bg-[var(--callout-danger-bg)] border border-destructive/20 text-destructive flex items-center gap-2" role="alert">
                    <XCircle className="w-4 h-4 shrink-0" />
                    <span>{loginError}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full h-10 rounded-xl text-sm font-semibold gap-2"
                >
                  {isLoggingIn ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      正在验证...
                    </>
                  ) : (
                    "验证并继续"
                  )}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setStep("enter-credentials");
                    setMfaCode("");
                    setLoginError(null);
                  }}
                  className="w-full h-auto py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  返回上一步
                </Button>
              </form>

              <p className="text-center text-xs text-muted-foreground/40 leading-relaxed">
                河北农大当前对教务系统启用了多因子认证
              </p>
            </>
          )}

          {/* ── Step 3: Data Loading ──────────────────────────── */}
          {step === "loading-data" && (
            <>
              {/* Success header */}
              <div className="text-center space-y-2">
                <div className="relative mx-auto w-12 h-12">
                  <div className="absolute inset-0 rounded-2xl bg-[var(--status-success)]/10 blur-xl" aria-hidden="true" />
                  <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-card/75 backdrop-blur-xl shadow-sm">
                    <CheckCircle2 className="w-5 h-5 text-[var(--status-success)]" strokeWidth={1.5} />
                  </div>
                </div>
                <h1 className="text-2xl font-bold font-display text-foreground tracking-tight">
                  登录成功
                </h1>
                <p className="text-sm text-muted-foreground">
                  正在加载你的教务数据...
                </p>
              </div>

              {/* Status items */}
              <div className="space-y-2">
                {fetchStatuses.map((s) => (
                  <div
                    key={s.key}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all",
                      s.status === "done" && "bg-[rgba(var(--status-success-rgb),0.1)] border border-[var(--status-success)]/15",
                      s.status === "loading" && "bg-secondary/50 border border-border/40",
                      s.status === "error" && "bg-[var(--callout-danger-bg)] border border-destructive/15",
                      s.status === "pending" && "bg-secondary/30 border border-border/30"
                    )}
                  >
                    {/* Status icon */}
                    {s.status === "done" && <CheckCircle2 className="w-4 h-4 text-[var(--status-success)] shrink-0" />}
                    {s.status === "loading" && <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />}
                    {s.status === "error" && <XCircle className="w-4 h-4 text-destructive shrink-0" />}
                    {s.status === "pending" && <div className="w-4 h-4 rounded-full bg-muted-foreground/20 shrink-0" />}

                    {/* Label */}
                    <span className={cn(
                      "text-sm",
                      s.status === "done" ? "text-foreground font-medium" : "text-muted-foreground"
                    )}>
                      {s.label}
                    </span>

                    {/* Message */}
                    {s.message && (
                      <span className="text-xs text-muted-foreground/60 ml-auto">
                        {s.message}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Enter app button */}
              {(() => {
                const hasError = fetchStatuses.some((s) => s.status === "error");
                const isLoading = fetchStatuses.some((s) => s.status === "loading");
                return (
                  <div className="space-y-2">
                    <Button
                      type="button"
                      onClick={handleEnterApp}
                      disabled={isLoading}
                      className="w-full h-10 rounded-xl text-sm font-semibold"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          正在同步数据…
                        </>
                      ) : hasError ? (
                        "进入 ScholarFlow"
                      ) : (
                        "进入 ScholarFlow"
                      )}
                    </Button>
                    {hasError && (
                      <p className="text-center text-xs text-muted-foreground">
                        部分数据同步失败，进入后可在设置里手动刷新。
                      </p>
                    )}
                  </div>
                );
              })()}
            </>
          )}
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground/30 mt-4">
          {`ScholarFlow v${APP_VERSION} — 独立学习管理中枢`}
        </p>
      </div>
    </div>
  );
}
