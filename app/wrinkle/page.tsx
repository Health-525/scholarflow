"use client";

import { useState, useRef, useCallback, useEffect } from "react";

const API_URL = process.env.NEXT_PUBLIC_WRINKLE_API_URL || "http://localhost:8000";
const WS_URL = API_URL.replace(/^http/, "ws") + "/ws/realtime";

interface RealtimeData {
  face_detected: boolean;
  wrinkle_score: number;
  brow_rising: boolean;
  brow_eye_ratio: number;
  severity: string;
  forehead_rect: number[] | null;
  heatmap: string | null;
}

// ── 本地存储 ──
interface BrowEvent {
  time: number;       // timestamp
  score: number;
  severity: string;
}

interface DayRecord {
  date: string;       // YYYY-MM-DD
  avgScore: number;
  maxScore: number;
  browEvents: BrowEvent[];
  scanMinutes: number;
}

const STORAGE_KEY = "sf-wrinkle-history";
const CALIB_KEY = "sf-wrinkle-calibration";

interface Calibration {
  baseline: number;       // 静息皱纹基线
  riseThreshold: number;  // 抬眉阈值
  sensitivity: "low" | "medium" | "high";
  cooldown: number;       // 冷却秒数
  calibratedAt: number;   // 校准时间戳
}

const DEFAULT_CALIBRATION: Calibration = {
  baseline: 0,
  riseThreshold: 1.25,
  sensitivity: "medium",
  cooldown: 20,
  calibratedAt: 0,
};

function loadCalibration(): Calibration {
  try {
    const raw = localStorage.getItem(CALIB_KEY);
    return raw ? { ...DEFAULT_CALIBRATION, ...JSON.parse(raw) } : DEFAULT_CALIBRATION;
  } catch { return DEFAULT_CALIBRATION; }
}

function saveCalibration(cal: Calibration) {
  localStorage.setItem(CALIB_KEY, JSON.stringify(cal));
}

function loadHistory(): DayRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveHistory(records: DayRecord[]) {
  // 最多保留90天
  const trimmed = records.slice(-90);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function upsertDay(records: DayRecord[], event: BrowEvent, scanMinDelta: number): DayRecord[] {
  const key = todayKey();
  const idx = records.findIndex(r => r.date === key);
  if (idx >= 0) {
    const d = records[idx];
    const allScores = [...d.browEvents.map(e => e.score), event.score];
    records[idx] = {
      ...d,
      avgScore: Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length),
      maxScore: Math.max(d.maxScore, event.score),
      browEvents: [...d.browEvents, event],
      scanMinutes: d.scanMinutes + scanMinDelta,
    };
  } else {
    records.push({
      date: key,
      avgScore: event.score,
      maxScore: event.score,
      browEvents: [event],
      scanMinutes: scanMinDelta,
    });
  }
  return records;
}

const SEVERITY: Record<string, { label: string; color: string; ring: string }> = {
  no_face:    { label: "检测中",   color: "text-muted-foreground", ring: "#a1a1aa" },
  "无皱纹":   { label: "良好",     color: "text-emerald-500",      ring: "#10b981" },
  "轻微":     { label: "轻微",     color: "text-teal-500",         ring: "#14b8a6" },
  "中等":     { label: "中等",     color: "text-amber-500",        ring: "#f59e0b" },
  "明显":     { label: "明显",     color: "text-orange-500",       ring: "#f97316" },
  "严重":     { label: "严重",     color: "text-rose-500",         ring: "#f43f5e" },
};

type ViewState = "monitor" | "preview";

// ── 校准采集步骤组件 ──
function CalibCapturingStep({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const duration = 3000;
    const timer = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(100, (elapsed / duration) * 100);
      setProgress(pct);
      if (elapsed >= duration) {
        clearInterval(timer);
        onComplete();
      }
    }, 50);
    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <>
      <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 flex items-center justify-center">
        <span className="text-2xl">😌</span>
      </div>
      <h2 className="text-base font-semibold">保持自然表情</h2>
      <p className="text-xs text-muted-foreground">请正对摄像头，保持放松，不要抬眉</p>
      <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
        <div className="bg-primary rounded-full h-2 transition-all duration-100" style={{ width: `${progress}%` }} />
      </div>
      <p className="text-[10px] text-muted-foreground">正在采集基线... {Math.round(progress)}%</p>
    </>
  );
}

export default function WrinklePage() {
  const [viewState, setViewState] = useState<ViewState>("monitor");
  const [apiStatus, setApiStatus] = useState<"checking" | "online" | "offline">("checking");
  const [apiMethodInfo, setApiMethodInfo] = useState<string>("");
  const [daemonRunning, setDaemonRunning] = useState(false);
  const [lastAlert, setLastAlert] = useState<BrowEvent | null>(null);
  const [history, setHistory] = useState<DayRecord[]>([]);
  const [calibration, setCalibration] = useState<Calibration>(DEFAULT_CALIBRATION);
  const [showCalibration, setShowCalibration] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [calibStep, setCalibStep] = useState(0); // 0=idle, 1=capturing, 2=done

  // Preview state
  const [rtData, setRtData] = useState<RealtimeData | null>(null);
  const [scoreHistory, setScoreHistory] = useState<number[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sendIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasInit = useRef(false);
  const scanStartRef = useRef<number>(0);

  const isElectron = typeof window !== "undefined" && !!window.electronAPI?.isElectron;
  const ea = isElectron ? window.electronAPI : null;

  // ── 加载历史 + 校准 ──
  useEffect(() => {
    setHistory(loadHistory());
    const cal = loadCalibration();
    setCalibration(cal);
    // 首次使用（未校准过）自动弹出校准引导
    if (cal.calibratedAt === 0) setShowCalibration(true);
  }, []);

  // ── API ──
  const checkApi = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/health`, { signal: AbortSignal.timeout(3000) });
      const d = await res.json();
      setApiStatus(d.detector_loaded || d.skinage_loaded || d.segmenter_loaded || d.skin_analyzer_loaded ? "online" : "offline");
      if (d.segmenter_loaded) setApiMethodInfo("SegFormer 像素分割");
      else if (d.skinage_loaded) setApiMethodInfo("SkinAge 深度学习");
      else setApiMethodInfo("传统CV");
    } catch { setApiStatus("offline"); }
  }, []);

  // ── Daemon ──
  const startDaemon = useCallback(async () => {
    if (!ea) return false;
    try {
      const r = await ea.browMonitorStart();
      if (r.ok) { setDaemonRunning(true); await ea.petShow().catch(() => {}); scanStartRef.current = Date.now(); return true; }
    } catch {}
    return false;
  }, [ea]);

  const stopDaemon = useCallback(async () => {
    if (!ea) return;
    try { await ea.browMonitorStop(); setDaemonRunning(false); } catch {}
    try { await ea.petHide(); } catch {}
  }, [ea]);

  // ── 初始化 ──
  useEffect(() => {
    if (hasInit.current) return;
    hasInit.current = true;
    checkApi();
    if (ea) {
      ea.browMonitorStatus().then(async (s) => {
        if (s.running) { setDaemonRunning(true); await ea.petShow().catch(() => {}); scanStartRef.current = Date.now(); }
        else { await startDaemon(); }
      }).catch(() => {});
    }
  }, [ea, checkApi, startDaemon]);

  // ── Daemon 状态轮询 ──
  useEffect(() => {
    if (!ea) return;
    const t = setInterval(async () => {
      try { const s = await ea.browMonitorStatus(); setDaemonRunning(s.running); } catch {}
    }, 5000);
    return () => clearInterval(t);
  }, [ea]);

  // ── 提醒轮询 + 记录 ──
  useEffect(() => {
    const t = setInterval(async () => {
      try {
        const res = await fetch("/api/wrinkle-alert");
        if (res.ok) {
          const d = await res.json();
          if (d.rising) {
            const evt: BrowEvent = { time: d.time || Date.now() / 1000, score: d.score, severity: "中等" };
            setLastAlert(evt);
            setHistory(prev => {
              const scanMin = scanStartRef.current ? (Date.now() - scanStartRef.current) / 60000 : 0;
              const updated = upsertDay(prev, evt, Math.min(scanMin, 1));
              saveHistory(updated);
              return updated;
            });
          }
        }
      } catch {}
    }, 3000);
    return () => clearInterval(t);
  }, []);

  // ── Preview ──
  const startPreview = useCallback(async () => {
    if (ea) { await stopDaemon(); await new Promise(r => setTimeout(r, 500)); }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: "user" } });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;
      ws.onopen = () => { setViewState("preview"); scanStartRef.current = Date.now(); };
      ws.onmessage = (ev) => {
        try {
          const data: RealtimeData = JSON.parse(ev.data);
          setRtData(data);
          if (data.face_detected) setScoreHistory(prev => [...prev.slice(-59), data.wrinkle_score]);
        } catch {}
      };
      ws.onclose = () => setViewState("monitor");
      ws.onerror = () => setViewState("monitor");
      const canvas = document.createElement("canvas");
      canvas.width = 640; canvas.height = 480;
      const ctx = canvas.getContext("2d")!;
      sendIntervalRef.current = setInterval(() => {
        if (ws.readyState !== WebSocket.OPEN || !videoRef.current) return;
        ctx.drawImage(videoRef.current, 0, 0, 640, 480);
        canvas.toBlob(blob => { if (blob && ws.readyState === WebSocket.OPEN) blob.arrayBuffer().then(buf => ws.send(buf)); }, "image/jpeg", 0.7);
      }, 100);
    } catch { startDaemon(); }
  }, [ea, stopDaemon, startDaemon]);

  const stopPreview = useCallback(async () => {
    if (sendIntervalRef.current) clearInterval(sendIntervalRef.current);
    if (wsRef.current) wsRef.current.close();
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    setRtData(null); setScoreHistory([]);
    setViewState("monitor");
    await startDaemon();
  }, [startDaemon]);

  useEffect(() => {
    return () => {
      if (sendIntervalRef.current) clearInterval(sendIntervalRef.current);
      if (wsRef.current) wsRef.current.close();
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (ea) ea.browMonitorStart().then(r => { if (r.ok) ea.petShow().catch(() => {}); }).catch(() => {});
    };
  }, []);

  // ── 衍生数据 ──
  const score = rtData?.face_detected ? rtData.wrinkle_score : 0;
  const R = 26, C = 2 * Math.PI * R, dashOff = C - (score / 100) * C;
  const sev = rtData ? (SEVERITY[rtData.severity] || { label: rtData.severity, color: "text-muted-foreground", ring: "#a1a1aa" }) : SEVERITY.no_face;
  const avgScore = scoreHistory.length > 0 ? scoreHistory.reduce((a, b) => a + b, 0) / scoreHistory.length : 0;

  const todayRecord = history.find(r => r.date === todayKey());
  const todayEvents = todayRecord?.browEvents || [];
  const todayBrowCount = todayEvents.length;
  const recentDays = history.slice(-7);

  const formatTime = (ts: number) => new Date(ts * 1000).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
  const formatShortDate = (d: string) => { const dt = new Date(d); return `${dt.getMonth()+1}/${dt.getDate()}`; };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col -mx-4 md:-mx-8 lg:-mx-10">
      {/* ══════ MONITOR ══════ */}
      {viewState === "monitor" && (
        <div className="flex-1 flex flex-col">
          {/* 顶栏 */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-3">
              <h1 className="text-base font-semibold">抬头纹监控</h1>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${daemonRunning ? "bg-emerald-500/15 text-emerald-500" : "bg-rose-500/15 text-rose-500"}`}>
                {daemonRunning ? "运行中" : "未启动"}
              </span>
              {apiMethodInfo && <span className="text-[9px] text-muted-foreground">{apiMethodInfo}</span>}
            </div>
            <button onClick={startDaemon} disabled={daemonRunning}
              className="text-[11px] font-medium px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:bg-muted disabled:text-muted-foreground text-primary-foreground transition-all">
              {daemonRunning ? "已启动" : "启动监控"}
            </button>
            <button onClick={() => setShowSettings(true)}
              className="ml-1 p-1.5 rounded-lg hover:bg-secondary transition-colors" title="设置">
              <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 w-full">

            {/* ── 今日概览卡片 ── */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-card rounded-xl p-3 border border-border text-center">
                <p className="text-2xl font-bold text-primary">{todayBrowCount}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">今日抬眉</p>
              </div>
              <div className="bg-card rounded-xl p-3 border border-border text-center">
                <p className="text-2xl font-bold text-amber-500">{todayRecord?.avgScore || "--"}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">平均评分</p>
              </div>
              <div className="bg-card rounded-xl p-3 border border-border text-center">
                <p className="text-2xl font-bold text-orange-500">{todayRecord?.maxScore || "--"}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">最高评分</p>
              </div>
            </div>

            {/* ── 7天趋势 ── */}
            {recentDays.length > 1 && (
              <div className="bg-card rounded-xl p-4 border border-border">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium">7天趋势</span>
                  <span className="text-[10px] text-muted-foreground">抬眉次数</span>
                </div>
                <div className="h-16 flex items-end gap-2">
                  {recentDays.map((d, i) => (
                    <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full rounded-t bg-primary/70 transition-all"
                        style={{ height: `${Math.max((d.browEvents.length / Math.max(...recentDays.map(x => x.browEvents.length), 1)) * 100, 4)}%` }}
                      />
                      <span className="text-[9px] text-muted-foreground">{formatShortDate(d.date)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── 今日抬眉记录 ── */}
            {todayEvents.length > 0 && (
              <div className="bg-card rounded-xl border border-border overflow-hidden">
                <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
                  <span className="text-xs font-medium">今日抬眉记录</span>
                  <span className="text-[10px] text-muted-foreground">{todayEvents.length} 次</span>
                </div>
                <div className="divide-y divide-border max-h-40 overflow-y-auto">
                  {[...todayEvents].reverse().slice(0, 10).map((evt, i) => (
                    <div key={i} className="px-4 py-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                        <span className="text-xs text-muted-foreground">{formatTime(evt.time)}</span>
                      </div>
                      <span className="text-xs font-semibold text-amber-500">{evt.score.toFixed(0)} 分</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── 最近提醒 ── */}
            {lastAlert && (
              <div className="px-4 py-3 rounded-xl bg-orange-500/10 border border-orange-500/20">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-orange-400" />
                  <span className="text-sm font-semibold text-orange-500">检测到抬眉</span>
                  <span className="text-[10px] text-orange-400/50 ml-auto">{formatTime(lastAlert.time)}</span>
                </div>
                <p className="text-xs text-orange-400/60 mt-1 pl-4">皱纹评分 {lastAlert.score.toFixed(0)} · 请放松额头肌肉</p>
              </div>
            )}

            {/* ── 工作原理 ── */}
            {daemonRunning && todayEvents.length === 0 && (
              <div className="space-y-2">
                <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-card border border-border">
                  <span className="text-base mt-0.5">🐒</span>
                  <div>
                    <p className="text-xs text-foreground font-medium">小猴子在右下角</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">检测到抬眉会摇晃提醒你</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-card border border-border">
                  <span className="text-base mt-0.5">📷</span>
                  <div>
                    <p className="text-xs text-foreground font-medium">摄像头静默运行</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">无窗口，20秒冷却避免打扰</p>
                  </div>
                </div>
              </div>
            )}

            {/* ── 操作按钮 ── */}
            <div className="space-y-2">
              {daemonRunning && apiStatus === "online" && (
                <button onClick={startPreview}
                  className="w-full py-3 rounded-xl bg-secondary hover:bg-secondary/80 border border-border text-sm text-secondary-foreground font-medium transition-all">
                  实时预览
                </button>
              )}
              {daemonRunning && (
                <button onClick={stopDaemon}
                  className="w-full py-2 text-xs text-muted-foreground hover:text-rose-500 transition-colors">
                  停止监控
                </button>
              )}
            </div>

            {/* ── 隐私说明 ── */}
            <p className="text-[9px] text-muted-foreground text-center leading-relaxed">
              所有数据本地处理，不上传云端 · 历史仅存本机 · 可随时清除
            </p>

            {/* ── 离线提示 ── */}
            {apiStatus === "offline" && (
              <div className="px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-center">
                <p className="text-xs text-rose-500 font-medium">检测服务离线</p>
                <p className="text-[10px] text-rose-400/50 font-mono mt-1">cd vision-model && python src/api/server.py</p>
              </div>
            )}

            {/* ── 无数据提示 ── */}
            {!daemonRunning && todayEvents.length === 0 && (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-muted flex items-center justify-center mb-4">
                  <svg className="w-7 h-7 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-foreground">监控未启动</p>
                <p className="text-xs text-muted-foreground mt-1">启动后，小猴子会在后台静默监测</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════ PREVIEW ══════ */}
      {viewState === "preview" && (
        <div className="relative h-[calc(100vh-0px)] overflow-hidden bg-card">
          <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" playsInline muted style={{ transform: "scaleX(-1)" }} />
          <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />

          {rtData?.face_detected && rtData.forehead_rect && (
            <div className="absolute pointer-events-none transition-all duration-150" style={{
              left: `${(1 - rtData.forehead_rect[2] / 640) * 100}%`, top: `${(rtData.forehead_rect[1] / 480) * 100}%`,
              width: `${((rtData.forehead_rect[2] - rtData.forehead_rect[0]) / 640) * 100}%`, height: `${((rtData.forehead_rect[3] - rtData.forehead_rect[1]) / 480) * 100}%`,
              border: `1.5px solid ${rtData.brow_rising ? "rgba(251,146,60,0.65)" : "rgba(34,211,238,0.3)"}`, borderRadius: 10,
              boxShadow: rtData.brow_rising ? "0 0 28px rgba(251,146,60,0.2)" : "none",
            }}>
              {rtData.heatmap && <img src={rtData.heatmap} alt="" className="w-full h-full object-cover opacity-40 rounded-[8px]" />}
            </div>
          )}

          <div className="absolute top-5 left-4 flex items-center gap-3">
            <div className="relative w-[56px] h-[56px]">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 60 60">
                <circle cx="30" cy="30" r={R} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3.5" />
                <circle cx="30" cy="30" r={R} fill="none" stroke={sev.ring} strokeWidth="3.5" strokeLinecap="round"
                  strokeDasharray={C} strokeDashoffset={dashOff} style={{ transition: "stroke-dashoffset 0.3s, stroke 0.3s" }} />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[13px] font-bold text-white tabular-nums">{score.toFixed(0)}</span>
            </div>
            <div>
              <p className={`text-[12px] font-semibold ${sev.color}`}>{sev.label}</p>
              {rtData?.brow_rising ? (
                <p className="text-[10px] text-orange-400 font-medium animate-pulse mt-0.5">抬眉中</p>
              ) : rtData?.face_detected ? (
                <p className="text-[10px] text-zinc-400 mt-0.5">预览中</p>
              ) : (
                <p className="text-[10px] text-zinc-500 mt-0.5">等待人脸</p>
              )}
            </div>
          </div>

          <div className="absolute top-5 right-4">
            <button onClick={stopPreview}
              className="flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-full backdrop-blur-xl bg-white/[0.08] border border-white/[0.08] text-zinc-300 hover:text-white transition-all">
              返回
            </button>
          </div>

          {scoreHistory.length > 5 && (
            <div className="absolute inset-x-0 bottom-0 px-4 pb-5">
              <div className="rounded-2xl bg-white/[0.06] backdrop-blur-xl border border-white/[0.08] px-4 pt-3 pb-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-zinc-400 font-medium">Wrinkle Trend</span>
                  <span className="text-[10px] text-zinc-500 tabular-nums">avg {avgScore.toFixed(0)}</span>
                </div>
                <div className="h-8 flex items-end gap-[1px]">
                  {scoreHistory.map((s, i) => (
                    <div key={i} className="flex-1 rounded-t-sm" style={{ height: `${Math.max(s, 2)}%`, background: sev.ring, opacity: 0.2 + (i / scoreHistory.length) * 0.8, transition: "height 0.15s" }} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════ 设置面板 ══════ */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setShowSettings(false)}>
          <div className="bg-card rounded-2xl border border-border shadow-lg w-80 p-5 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">监控设置</h2>
              <button onClick={() => setShowSettings(false)} className="text-muted-foreground hover:text-foreground">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* 灵敏度 */}
            <div>
              <label className="text-xs text-muted-foreground">灵敏度</label>
              <div className="flex gap-2 mt-1">
                {(["low", "medium", "high"] as const).map(s => (
                  <button key={s} onClick={() => { const c = { ...calibration, sensitivity: s }; setCalibration(c); saveCalibration(c); }}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${calibration.sensitivity === s ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                    {{ low: "低", medium: "中", high: "高" }[s]}
                  </button>
                ))}
              </div>
            </div>

            {/* 冷却时间 */}
            <div>
              <label className="text-xs text-muted-foreground">提醒冷却</label>
              <div className="flex gap-2 mt-1">
                {[15, 20, 30, 60].map(t => (
                  <button key={t} onClick={() => { const c = { ...calibration, cooldown: t }; setCalibration(c); saveCalibration(c); }}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${calibration.cooldown === t ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                    {t}s
                  </button>
                ))}
              </div>
            </div>

            {/* 校准 */}
            <div>
              <label className="text-xs text-muted-foreground">基线校准</label>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {calibration.calibratedAt > 0
                  ? `上次校准: ${new Date(calibration.calibratedAt).toLocaleDateString("zh-CN")}`
                  : "未校准 — 建议首次使用前校准"}
              </p>
              <button onClick={() => { setShowSettings(false); setShowCalibration(true); setCalibStep(0); }}
                className="w-full mt-2 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-xs font-medium text-secondary-foreground transition-all">
                重新校准
              </button>
            </div>

            {/* 清除数据 */}
            <button onClick={() => { if (confirm("清除所有检测历史？")) { localStorage.removeItem(STORAGE_KEY); setHistory([]); } }}
              className="w-full py-2 text-xs text-muted-foreground hover:text-rose-500 transition-colors">
              清除历史数据
            </button>
          </div>
        </div>
      )}

      {/* ══════ 校准引导 ══════ */}
      {showCalibration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-card rounded-2xl border border-border shadow-lg w-80 p-6 text-center space-y-4">
            {calibStep === 0 && (
              <>
                <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
                  <span className="text-2xl">🐒</span>
                </div>
                <h2 className="text-base font-semibold">首次校准</h2>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  校准帮助小猴子了解你的表情基线，<br/>
                  减少误报。整个过程只需5秒。
                </p>
                <button onClick={() => setCalibStep(1)}
                  className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all">
                  开始校准
                </button>
                <button onClick={() => { setShowCalibration(false); saveCalibration({ ...calibration, calibratedAt: Date.now() }); }}
                  className="w-full py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  跳过
                </button>
              </>
            )}
            {calibStep === 1 && (
              <CalibCapturingStep onComplete={() => {
                const cal: Calibration = { ...calibration, baseline: 0, calibratedAt: Date.now(), sensitivity: "medium" };
                saveCalibration(cal);
                setCalibration(cal);
                setCalibStep(2);
              }} />
            )}
            {calibStep === 2 && (
              <>
                <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                  <span className="text-2xl">✅</span>
                </div>
                <h2 className="text-base font-semibold">校准完成！</h2>
                <p className="text-xs text-muted-foreground">
                  小猴子已了解你的表情基线，<br/>会减少误报，更精准提醒。
                </p>
                <button onClick={() => { setShowCalibration(false); startDaemon(); }}
                  className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all">
                  开始监控
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
