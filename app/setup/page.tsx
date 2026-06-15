"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { GraduationCap, KeyRound, Loader2, ArrowLeft, CheckCircle2, XCircle, BookOpen, ShieldCheck } from "lucide-react";

import { getSchoolOptions } from "@/lib/schools/registry";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";

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

  const schools = getSchoolOptions();

  const [step, setStep] = useState<Step>("select-school");
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>(schools[0]?.id || "");
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [loginError, setLoginError] = useState<string | null>(null);
  const [fetchStatuses, setFetchStatuses] = useState<FetchStatus[]>([]);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const selectedSchool = schools.find((s) => s.id === selectedSchoolId);

  useEffect(() => {
    if (selectedSchoolId) setCredentials({});
  }, [selectedSchoolId]);

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
        body: JSON.stringify({ schoolId: selectedSchoolId, credentials }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setLoginError(data.error || "登录失败，请检查学号和密码");
        setIsLoggingIn(false);
        return;
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
        <div className="card-glow rounded-[28px] bg-card/80 backdrop-blur-xl border border-border shadow-md p-8 space-y-6">

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
                <label className="block text-[11px] font-medium tracking-[0.12em] text-muted-foreground/70 uppercase">
                  选择学校
                </label>
                <div className="space-y-2">
                  {schools.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelectedSchoolId(s.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all",
                        "border border-border/60 bg-secondary/40 hover:bg-secondary/80",
                        selectedSchoolId === s.id
                          ? "border-primary/40 bg-primary/8 ring-2 ring-primary/20"
                          : ""
                      )}
                    >
                      <GraduationCap className={cn(
                        "w-4 h-4 shrink-0",
                        selectedSchoolId === s.id ? "text-primary" : "text-muted-foreground"
                      )} />
                      <span className={cn(
                        "font-medium",
                        selectedSchoolId === s.id ? "text-foreground" : "text-muted-foreground"
                      )}>
                        {s.name}
                      </span>
                      {selectedSchoolId === s.id && (
                        <CheckCircle2 className="w-4 h-4 text-primary ml-auto shrink-0" />
                      )}
                    </button>
                  ))}
                  {schools.length === 0 && (
                    <div className="text-center py-4 text-sm text-muted-foreground">
                      暂无可用学校
                    </div>
                  )}
                </div>
              </div>

              {/* Continue button */}
              <button
                type="button"
                onClick={handleSelectSchool}
                disabled={!selectedSchoolId}
                className={cn(
                  "w-full h-10 rounded-xl text-sm font-semibold transition-all",
                  "bg-primary text-primary-foreground",
                  "hover:bg-primary/80 active:translate-y-0.5",
                  "disabled:opacity-40 disabled:pointer-events-none"
                )}
              >
                继续
              </button>

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
                {/* Username */}
                <div className="space-y-1.5">
                  <label htmlFor="username" className="block text-[11px] font-medium tracking-[0.12em] text-muted-foreground/70 uppercase">
                    学号
                  </label>
                  <input
                    id="username"
                    type="text"
                    placeholder="如 202321144057"
                    value={credentials.username || ""}
                    onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                    className={cn(
                      "w-full h-10 px-4 rounded-xl text-sm outline-none transition-all",
                      "bg-secondary/50 border border-border/60 text-foreground",
                      "placeholder:text-muted-foreground/40",
                      "focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
                    )}
                    required
                    autoFocus
                  />
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label htmlFor="password" className="block text-[11px] font-medium tracking-[0.12em] text-muted-foreground/70 uppercase">
                    教务系统密码
                  </label>
                  <input
                    id="password"
                    type="password"
                    placeholder="正方教务系统密码"
                    value={credentials.password || ""}
                    onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                    className={cn(
                      "w-full h-10 px-4 rounded-xl text-sm outline-none transition-all",
                      "bg-secondary/50 border border-border/60 text-foreground",
                      "placeholder:text-muted-foreground/40",
                      "focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
                    )}
                    required
                  />
                </div>

                {/* Library JWT (optional) */}
                <div className="space-y-1.5">
                  <label htmlFor="libraryJwt" className="block text-[11px] font-medium tracking-[0.12em] text-muted-foreground/70 uppercase">
                    图书馆 JWT <span className="text-muted-foreground/40 normal-case tracking-normal">（可选）</span>
                  </label>
                  <input
                    id="libraryJwt"
                    type="password"
                    placeholder="从浏览器登录图书馆后提取"
                    value={credentials.libraryJwt || ""}
                    onChange={(e) => setCredentials({ ...credentials, libraryJwt: e.target.value })}
                    className={cn(
                      "w-full h-10 px-4 rounded-xl text-sm outline-none transition-all",
                      "bg-secondary/50 border border-border/60 text-foreground",
                      "placeholder:text-muted-foreground/40",
                      "focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
                    )}
                  />
                  <p className="text-[11px] text-muted-foreground/40">
                    用于查看图书馆座位信息，不填则跳过
                  </p>
                </div>

                {/* Error message */}
                {loginError && (
                  <div className="rounded-xl px-4 py-3 text-sm bg-destructive/8 border border-destructive/20 text-destructive flex items-center gap-2" role="alert">
                    <XCircle className="w-4 h-4 shrink-0" />
                    <span>{loginError}</span>
                  </div>
                )}

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className={cn(
                    "w-full h-10 rounded-xl text-sm font-semibold transition-all",
                    "bg-primary text-primary-foreground",
                    "hover:bg-primary/80 active:translate-y-0.5",
                    "disabled:opacity-60 disabled:pointer-events-none",
                    "flex items-center justify-center gap-2"
                  )}
                >
                  {isLoggingIn ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      正在登录...
                    </>
                  ) : (
                    "登录"
                  )}
                </button>

                {/* Back button */}
                <button
                  type="button"
                  onClick={() => { setStep("select-school"); setLoginError(null); }}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-[13px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  返回选择学校
                </button>
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
              <button
                type="button"
                onClick={handleEnterApp}
                className={cn(
                  "w-full h-10 rounded-xl text-sm font-semibold transition-all",
                  "bg-primary text-primary-foreground",
                  "hover:bg-primary/80 active:translate-y-0.5"
                )}
              >
                进入 ScholarFlow
              </button>
            </>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-muted-foreground/30 mt-4">
          ScholarFlow v2.0 — 独立学习管理中枢
        </p>
      </div>
    </div>
  );
}
