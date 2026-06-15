"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

import { getSchoolOptions } from "@/lib/schools/registry";
import { useAuthStore } from "@/store/auth";

type Step = "select-school" | "enter-credentials" | "loading-data";

interface FetchStatus {
  key: string;
  label: string;
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

  // Get login fields for selected school
  const selectedSchool = schools.find((s) => s.id === selectedSchoolId);

  // Initialize credentials with empty values for each field
  useEffect(() => {
    if (selectedSchoolId) {
      // We need to dynamically get loginFields from the adapter
      // Since this is client-side, we'll use a simpler approach
      setCredentials({});
    }
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

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolId: selectedSchoolId, credentials }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setLoginError(data.error || "登录失败");
        return;
      }

      // Save auth state
      setAuth(data.schoolId, data.userId || credentials.username || "");

      // Proceed to data loading
      setStep("loading-data");
      startDataFetch(data.schoolId, credentials);
    } catch (e) {
      setLoginError(e instanceof Error ? e.message : "网络错误");
    }
  }

  // ── Step 3: Data Loading ───────────────────────────────────

  async function startDataFetch(schoolId: string, creds: Record<string, string>) {
    const statuses: FetchStatus[] = [
      { key: "all", label: "教务数据", status: "loading" },
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
          { key: "schedule", label: "课表", status: "done", message: results.schedule },
          { key: "exams", label: "考试", status: "done", message: results.exams },
          { key: "grades", label: "成绩", status: "done", message: results.grades },
          { key: "jwcNews", label: "通知", status: "done", message: results.jwcNews },
        ]);
      } else {
        setFetchStatuses([
          { key: "all", label: "教务数据", status: "error", message: data.error },
        ]);
      }
    } catch (e) {
      setFetchStatuses([
        { key: "all", label: "教务数据", status: "error", message: e instanceof Error ? e.message : "网络错误" },
      ]);
    }
  }

  function handleEnterApp() {
    router.replace("/");
  }

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-md rounded-3xl p-8 bg-card border border-border shadow-lg">

        {/* Step 1: Select School */}
        {step === "select-school" && (
          <>
            <div className="text-center mb-8">
              <div className="text-5xl mb-3" aria-hidden="true">📚</div>
              <h1 className="text-2xl font-bold mb-1 text-foreground">ScholarFlow</h1>
              <p className="text-sm text-muted-foreground">选择你的学校</p>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="school-select" className="block text-sm font-medium mb-1.5 text-muted-foreground">
                  学校
                </label>
                <select
                  id="school-select"
                  value={selectedSchoolId}
                  onChange={(e) => setSelectedSchoolId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none bg-secondary border border-border text-foreground"
                >
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                  {schools.length === 0 && (
                    <option value="">暂无可用学校</option>
                  )}
                </select>
              </div>

              <button
                type="button"
                onClick={handleSelectSchool}
                disabled={!selectedSchoolId}
                className={`w-full py-3 rounded-xl text-sm font-semibold transition-opacity bg-primary text-primary-foreground ${
                  !selectedSchoolId ? "opacity-50" : ""
                }`}
              >
                下一步
              </button>
            </div>
          </>
        )}

        {/* Step 2: Enter Credentials */}
        {step === "enter-credentials" && (
          <>
            <div className="text-center mb-8">
              <div className="text-5xl mb-3" aria-hidden="true">🎓</div>
              <h1 className="text-2xl font-bold mb-1 text-foreground">
                {selectedSchool?.name || selectedSchoolId}
              </h1>
              <p className="text-sm text-muted-foreground">输入你的学校凭证</p>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }} className="space-y-4">
              {/* NJTECH specific fields */}
              <div>
                <label htmlFor="username" className="block text-sm font-medium mb-1.5 text-muted-foreground">
                  学号
                </label>
                <input
                  id="username"
                  type="text"
                  placeholder="如 202321144057"
                  value={credentials.username || ""}
                  onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none bg-secondary border border-border text-foreground"
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium mb-1.5 text-muted-foreground">
                  教务系统密码
                </label>
                <input
                  id="password"
                  type="password"
                  placeholder="正方教务系统密码"
                  value={credentials.password || ""}
                  onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none bg-secondary border border-border text-foreground"
                  required
                />
              </div>

              <div>
                <label htmlFor="libraryJwt" className="block text-sm font-medium mb-1.5 text-muted-foreground">
                  图书馆 JWT（可选）
                </label>
                <input
                  id="libraryJwt"
                  type="password"
                  placeholder="从浏览器登录图书馆后提取"
                  value={credentials.libraryJwt || ""}
                  onChange={(e) => setCredentials({ ...credentials, libraryJwt: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none bg-secondary border border-border text-foreground"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  用于查看图书馆座位信息，不填则跳过
                </p>
              </div>

              {loginError && (
                <div className="rounded-xl px-4 py-3 text-sm bg-red-500/8 border border-red-500/20 text-red-500" role="alert">
                  {loginError}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 rounded-xl text-sm font-semibold transition-opacity bg-primary text-primary-foreground"
              >
                登录
              </button>

              <button
                type="button"
                onClick={() => setStep("select-school")}
                className="w-full py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                ← 返回选择学校
              </button>
            </form>
          </>
        )}

        {/* Step 3: Data Loading */}
        {step === "loading-data" && (
          <>
            <div className="text-center mb-8">
              <div className="text-5xl mb-3" aria-hidden="true">✅</div>
              <h1 className="text-2xl font-bold mb-1 text-foreground">登录成功！</h1>
              <p className="text-sm text-muted-foreground">正在加载你的数据...</p>
            </div>

            <div className="space-y-3">
              {fetchStatuses.map((s) => (
                <div key={s.key} className="flex items-center gap-3 px-4 py-2 rounded-xl bg-secondary">
                  {s.status === "done" && <span className="text-green-500">✅</span>}
                  {s.status === "loading" && <span className="text-yellow-500 animate-pulse">⏳</span>}
                  {s.status === "error" && <span className="text-red-500">❌</span>}
                  {s.status === "pending" && <span className="text-muted-foreground">⬜</span>}
                  <span className="text-sm text-foreground">{s.label}</span>
                  {s.message && (
                    <span className="text-xs text-muted-foreground ml-auto">{s.message}</span>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleEnterApp}
              className="w-full py-3 rounded-xl text-sm font-semibold mt-6 transition-opacity bg-primary text-primary-foreground"
            >
              进入 ScholarFlow
            </button>
          </>
        )}
      </div>
    </div>
  );
}
