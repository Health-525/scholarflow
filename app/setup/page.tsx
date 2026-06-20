"use client";

import { GraduationCap, KeyRound, Loader2, ArrowLeft, CheckCircle2, XCircle, BookOpen, ShieldCheck, Eye, EyeClosed } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { isElectron, isSecureStorageAvailable, rememberPasswordSupported } from "@/lib/runtime-env";
import { getAllSchools } from "@/lib/schools/registry";
import type { SchoolAdapter } from "@/lib/schools/types";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";

type Step = "select-school" | "enter-credentials" | "loading-data";

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

  const selectedSchool = schools.find((s) => s.id === selectedSchoolId) as SchoolAdapter | undefined;

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
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -left-32 -top-32 h-64 w-64 rounded-full bg-primary/6 blur-3xl" />
        <div className="absolute -right-24 -bottom-24 h-48 w-48 rounded-full bg-[var(--bg-gradient)] opacity-40 blur-3xl" />
        <div className="absolute left-1/2 top-1/3 h-32 w-32 rounded-full bg-primary/4 blur-2xl" />
      </div>

      <div className="relative w-full max-w-[420px] animate-fade-up">
        {/* Card container */}
        <Card className="rounded-[28px] bg-card/80 backdrop-blur-xl shadow-md p-8 space-y-6 hover:translate-y-0 hover:shadow-md">

          {/* ── Step 1: Select School ─────────────────────────── */}
          {step === "select-school" && (
            <>
              {/* Brand header */}
              <div className="text-center space-y-3">
                <div className="relative mx-auto w-16 h-16">
                  <div className="absolute inset-0 rounded-[22px] bg-primary/10 blur-2xl" aria-hidden="true" />
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-[22px] bg-card/75 backdrop-blur-xl shadow-sm">
                    <GraduationCap className="w-8 h-8 text-primary" strokeWidth={1.5} />
                  </div>
                </div>
                <h1 className="text-[28px] font-bold font-display text-foreground tracking-tight">
                  ScholarFlow
                </h1>
                <p className="text-[13px] text-muted-foreground">
                  你的独立学习管理中枢
                </p>
              </div>

              {/* School selector */}
              <div className="space-y-3">
                <span className="block text-[11px] font-medium tracking-[0.12em] text-muted-foreground/70 uppercase">
                  选择学校
                </span>
                <div className="space-y-2">
                  {schools.map((s) => (
                    <Button
                      key={s.id}
                      type="button"
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

              <p className="text-center text-[11px] text-muted-foreground/50">
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
                <h1 className="text-[22px] font-bold font-display text-foreground tracking-tight">
                  {selectedSchool?.name || selectedSchoolId}
                </h1>
                <p className="text-[13px] text-muted-foreground">
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
                      <label htmlFor={field.key} className="block text-[11px] font-medium tracking-[0.12em] text-muted-foreground/70 uppercase">
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
                            tabIndex={-1}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground/60 hover:text-foreground hover:bg-secondary transition-colors"
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
                      <span className="text-[13px] text-foreground">记住密码</span>
                    </label>
                    <p className="pl-[26px] text-[11px] text-muted-foreground/50 leading-relaxed">
                      密码将加密存储在本地，仅用于自动更新
                    </p>
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground/40 leading-relaxed">
                    当前形态不支持记住密码
                  </p>
                )}

                {/* Error message */}
                {loginError && (
                  <div className="rounded-xl px-4 py-3 text-sm bg-destructive/8 border border-destructive/20 text-destructive flex items-center gap-2" role="alert">
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
                  className="w-full h-auto py-2 rounded-xl text-[13px] text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  返回选择学校
                </Button>
              </form>

              {/* Security note */}
              <p className="text-center text-[11px] text-muted-foreground/40 leading-relaxed">
                密码仅用于本地获取数据，不会上传至任何服务器
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
                <h1 className="text-[22px] font-bold font-display text-foreground tracking-tight">
                  登录成功
                </h1>
                <p className="text-[13px] text-muted-foreground">
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
                      s.status === "done" && "bg-[var(--status-success)]/6 border border-[var(--status-success)]/15",
                      s.status === "loading" && "bg-secondary/50 border border-border/40",
                      s.status === "error" && "bg-destructive/6 border border-destructive/15",
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
                      <span className="text-[11px] text-muted-foreground/60 ml-auto">
                        {s.message}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Enter app button */}
              <Button
                type="button"
                onClick={handleEnterApp}
                className="w-full h-10 rounded-xl text-sm font-semibold"
              >
                进入 ScholarFlow
              </Button>
            </>
          )}
        </Card>

        {/* Footer */}
        <p className="text-center text-[11px] text-muted-foreground/30 mt-4">
          ScholarFlow v2.0 — 独立学习管理中枢
        </p>
      </div>
    </div>
  );
}
