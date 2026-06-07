"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Image from "next/image";

const API_URL = process.env.NEXT_PUBLIC_WRINKLE_API_URL || "http://localhost:8000";
const WS_URL = API_URL.replace(/^http/, "ws") + "/ws/realtime";

interface ZoneConcern {
  score: number;
  severity: string;
}

interface ZoneScore {
  zone: string;
  composite_score: number;
  label: string;
  concerns: Record<string, ZoneConcern>;
}

interface SkinResult {
  success: boolean;
  face_detected: boolean;
  overall_score: number;
  predicted_age: number;
  age_delta: number | null;
  wrinkle_level: number;
  wrinkle_label: string;
  zone_scores: ZoneScore[];
  message: string;
}

interface RealtimeData {
  face_detected: boolean;
  wrinkle_score: number;
  brow_rising: boolean;
  brow_eye_ratio: number;
  severity: string;
  forehead_rect: number[] | null;
  heatmap: string | null;
}

const ZONE_NAMES: Record<string, string> = {
  forehead: "额头",
  under_eyes: "眼下",
  cheeks: "脸颊",
  nose: "鼻子",
  chin: "下巴",
  crow_feet: "眼角",
  nasolabial: "法令纹",
};

const CONCERN_NAMES: Record<string, string> = {
  wrinkle: "皱纹",
  pigmentation: "色素",
  redness: "红血丝",
  pore_texture: "毛孔",
};

const SEVERITY_COLORS: Record<string, string> = {
  minimal: "text-green-400",
  mild: "text-emerald-400",
  moderate: "text-amber-400",
  significant: "text-rose-400",
};

const SEVERITY_CN: Record<string, string> = {
  no_face: "未检测到",
  "无皱纹": "无皱纹",
  "轻微": "轻微",
  "中等": "中等",
  "明显": "明显",
  "严重": "严重",
};

const WRINKLE_CONFIG: Record<number, { icon: string; label: string; color: string }> = {
  0: { icon: "😊", label: "无明显皱纹", color: "text-emerald-500" },
  1: { icon: "😐", label: "轻微皱纹", color: "text-amber-500" },
  2: { icon: "😟", label: "明显皱纹", color: "text-rose-500" },
};

type Mode = "photo" | "realtime" | "daemon";
type ApiStatus = "checking" | "online" | "offline" | "starting";

export default function WrinklePage() {
  const [mode, setMode] = useState<Mode>("photo");
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<SkinResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState<ApiStatus>("checking");
  const [daemonRunning, setDaemonRunning] = useState(false);
  const [lastAlert, setLastAlert] = useState<{ score: number; time: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Realtime state
  const [rtData, setRtData] = useState<RealtimeData | null>(null);
  const [rtConnected, setRtConnected] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sendIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [scoreHistory, setScoreHistory] = useState<number[]>([]);

  // 检查 API 状态
  const checkApi = useCallback(async () => {
    setApiStatus("checking");
    try {
      const res = await fetch(`${API_URL}/health`, { signal: AbortSignal.timeout(3000) });
      const data = await res.json();
      setApiStatus(data.skin_analyzer_loaded ? "online" : "offline");
    } catch {
      const api = (window as unknown as { electronAPI?: { visionModelStart: () => Promise<{ ok: boolean; message: string }> } }).electronAPI;
      if (api?.visionModelStart) {
        setApiStatus("starting");
        try {
          const { ok } = await api.visionModelStart();
          if (ok) {
            for (let i = 0; i < 10; i++) {
              await new Promise(r => setTimeout(r, 1000));
              try {
                const retry = await fetch(`${API_URL}/health`, { signal: AbortSignal.timeout(2000) });
                if (retry.ok) { setApiStatus("online"); return; }
              } catch { /* continue */ }
            }
          }
        } catch {}
        setApiStatus("offline");
      } else {
        setApiStatus("offline");
      }
    }
  }, []);

  useEffect(() => { checkApi(); }, [checkApi]);

  // ─── Daemon mode ───
  const isElectron = typeof window !== "undefined" && !!window.electronAPI?.isElectron;

  // 检查监控状态
  useEffect(() => {
    if (!isElectron) return;
    const check = async () => {
      try {
        const status = await window.electronAPI!.browMonitorStatus();
        setDaemonRunning(status.running);
      } catch {}
    };
    check();
    const timer = setInterval(check, 5000);
    return () => clearInterval(timer);
  }, [isElectron]);

  // 检查提醒
  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch("/api/wrinkle-alert");
        if (res.ok) {
          const data = await res.json();
          if (data.rising) setLastAlert({ score: data.score, time: data.time });
        }
      } catch {}
    };
    const timer = setInterval(check, 3000);
    return () => clearInterval(timer);
  }, []);

  const toggleDaemon = async () => {
    if (!window.electronAPI) return;
    if (daemonRunning) {
      await window.electronAPI.browMonitorStop();
      setDaemonRunning(false);
      // 自动隐藏宠物
      await window.electronAPI.petHide().catch(() => {});
    } else {
      const result = await window.electronAPI.browMonitorStart();
      if (result.ok) {
        setDaemonRunning(true);
        // 自动弹出宠物
        await window.electronAPI.petShow().catch(() => {});
      }
    }
  };

  // ─── Realtime mode ───
  const startRealtime = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => { setRtConnected(true); };

      ws.onmessage = (ev) => {
        try {
          const data: RealtimeData = JSON.parse(ev.data);
          setRtData(data);
          if (data.face_detected) {
            setScoreHistory(prev => {
              const next = [...prev, data.wrinkle_score];
              return next.length > 60 ? next.slice(-60) : next;
            });
          }
        } catch {}
      };

      ws.onclose = () => { setRtConnected(false); };
      ws.onerror = () => { setRtConnected(false); };

      // Send frames at ~10 fps
      const canvas = document.createElement("canvas");
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext("2d")!;

      sendIntervalRef.current = setInterval(() => {
        if (ws.readyState !== WebSocket.OPEN || !videoRef.current) return;
        ctx.drawImage(videoRef.current, 0, 0, 640, 480);
        canvas.toBlob(
          (blob) => {
            if (blob && ws.readyState === WebSocket.OPEN) {
              blob.arrayBuffer().then((buf) => ws.send(buf));
            }
          },
          "image/jpeg",
          0.7
        );
      }, 100);

    } catch (err) {
      setError("无法打开摄像头: " + String(err));
    }
  }, []);

  const stopRealtime = useCallback(() => {
    if (sendIntervalRef.current) clearInterval(sendIntervalRef.current);
    if (wsRef.current) wsRef.current.close();
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    setRtConnected(false);
    setRtData(null);
    setScoreHistory([]);
  }, []);

  useEffect(() => {
    if (mode !== "realtime") stopRealtime();
    return () => { stopRealtime(); };
  }, [mode, stopRealtime]);

  // ─── Photo mode ───
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null); setResult(null);
    setPreview(URL.createObjectURL(file));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith("image/")) {
      setError(null); setResult(null);
      setPreview(URL.createObjectURL(file));
    }
  };

  const detect = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setLoading(true); setError(null);
    const form = new FormData(); form.append("file", file);
    try {
      const res = await fetch(`${API_URL}/analyze/skin`, { method: "POST", body: form });
      const data = await res.json();
      if (!data.success && !data.face_detected) {
        setError(data.message || "未检测到人脸，请上传正脸照片");
      } else {
        setResult(data);
      }
    } catch {
      setError("无法连接检测服务");
      setApiStatus("offline");
    } finally { setLoading(false); }
  };

  const reset = () => {
    setPreview(null); setResult(null); setError(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const wrinkleConfig = result ? WRINKLE_CONFIG[result.wrinkle_level] : null;

  const severityColor = (sev: string) => {
    if (sev === "严重") return "text-rose-500";
    if (sev === "明显") return "text-orange-400";
    if (sev === "中等") return "text-amber-400";
    if (sev === "轻微") return "text-emerald-400";
    return "text-green-400";
  };

  const scoreBarColor = (score: number) => {
    if (score >= 80) return "bg-rose-500";
    if (score >= 60) return "bg-orange-500";
    if (score >= 40) return "bg-amber-500";
    return "bg-emerald-500";
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <h1 className="text-lg font-bold">皮肤检测</h1>
        <div className="flex items-center gap-2">
          {/* Mode toggle */}
          <div className="flex bg-zinc-800 rounded-lg overflow-hidden text-xs">
            <button
              onClick={() => setMode("photo")}
              className={`px-3 py-1.5 transition-colors ${mode === "photo" ? "bg-violet-600 text-white" : "text-zinc-400 hover:text-zinc-200"}`}
            >
              拍照检测
            </button>
            <button
              onClick={() => setMode("realtime")}
              className={`px-3 py-1.5 transition-colors ${mode === "realtime" ? "bg-violet-600 text-white" : "text-zinc-400 hover:text-zinc-200"}`}
            >
              实时监测
            </button>
            {isElectron && (
              <button
                onClick={() => setMode("daemon")}
                className={`px-3 py-1.5 transition-colors ${mode === "daemon" ? "bg-violet-600 text-white" : "text-zinc-400 hover:text-zinc-200"}`}
              >
                后台监控
              </button>
            )}
          </div>
          <span className={"text-xs px-3 py-1 rounded-full " + (
            apiStatus === "online" ? "bg-emerald-500/15 text-emerald-400" :
            apiStatus === "starting" ? "bg-amber-500/15 text-amber-400" :
            apiStatus === "offline" ? "bg-rose-500/15 text-rose-400" :
            "bg-zinc-800 text-zinc-400")}>
            {apiStatus === "online" ? "就绪" :
             apiStatus === "starting" ? "启动中..." :
             apiStatus === "offline" ? "离线" :
             "检测中..."}
          </span>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* API 离线提示 */}
        {apiStatus === "offline" && (
          <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl p-4 text-sm">
            <p className="font-medium mb-1">检测服务未启动</p>
            <p className="text-xs text-amber-400/70">
              请在终端运行: cd vision-model && python src/api/server.py
            </p>
          </div>
        )}

        {/* ═══════ PHOTO MODE ═══════ */}
        {mode === "photo" && (
          <>
            {!preview ? (
              <div onClick={() => fileRef.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}
                className="border-2 border-dashed border-zinc-700 rounded-2xl p-12 text-center cursor-pointer hover:border-violet-500/50 hover:bg-violet-500/5 transition-all">
                <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
                <div className="text-4xl mb-3">📷</div>
                <p className="text-zinc-400">点击或拖拽上传人脸照片</p>
                <p className="text-xs text-zinc-600 mt-2">正脸拍摄效果最佳</p>
              </div>
            ) : (
              <>
                <div className="relative rounded-2xl overflow-hidden bg-zinc-900">
                  <Image src={preview} alt="preview" width={480} height={480} className="w-full object-contain max-h-[400px]" />
                </div>
                <div className="flex gap-3">
                  <button onClick={detect} disabled={loading || apiStatus === "offline"}
                    className="flex-1 py-3 bg-violet-600 hover:bg-violet-500 rounded-xl font-semibold disabled:opacity-50 transition-colors">
                    {loading ? "分析中..." : "开始检测"}
                  </button>
                  <button onClick={reset}
                    className="px-5 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl border border-zinc-700 transition-colors">重选</button>
                </div>
              </>
            )}

            {loading && (
              <div className="text-center py-6 text-zinc-500">
                <div className="w-8 h-8 border-2 border-zinc-700 border-t-violet-500 rounded-full animate-spin mx-auto mb-3" />
                AI 正在分析皮肤...
              </div>
            )}

            {result && wrinkleConfig && (
              <div className="space-y-4">
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                  <div className="flex items-center gap-4 mb-3">
                    <span className="text-4xl">{wrinkleConfig.icon}</span>
                    <div>
                      <h2 className={"text-xl font-bold " + wrinkleConfig.color}>{wrinkleConfig.label}</h2>
                      <p className="text-sm text-zinc-400">综合评分: {result.overall_score.toFixed(1)}</p>
                    </div>
                  </div>
                  {result.predicted_age > 0 && (
                    <p className="text-sm text-zinc-500">预测皮肤年龄: {result.predicted_age.toFixed(0)}岁</p>
                  )}
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3">
                  <h3 className="text-sm font-semibold text-zinc-400">各区域分析</h3>
                  {result.zone_scores.map((zone) => (
                    <div key={zone.zone} className="border-b border-zinc-800 pb-2 last:border-0 last:pb-0">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium">{ZONE_NAMES[zone.zone] || zone.zone}</span>
                        <span className="text-xs text-zinc-500">{zone.composite_score.toFixed(1)}</span>
                      </div>
                      <div className="grid grid-cols-4 gap-1">
                        {Object.entries(zone.concerns).map(([key, val]) => (
                          <div key={key} className="text-center">
                            <p className="text-[10px] text-zinc-500">{CONCERN_NAMES[key] || key}</p>
                            <p className={"text-xs font-medium " + (SEVERITY_COLORS[val.severity] || "")}>{val.score.toFixed(0)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ═══════ REALTIME MODE ═══════ */}
        {mode === "realtime" && (
          <>
            {/* Video feed */}
            <div className="relative rounded-2xl overflow-hidden bg-zinc-900 aspect-[4/3]">
              <video ref={videoRef} className="w-full h-full object-cover" playsInline muted style={{ transform: "scaleX(-1)" }} />
              <canvas ref={canvasRef} className="hidden" />

              {/* Overlay: forehead rect + heatmap */}
              {rtData?.face_detected && rtData.forehead_rect && (
                <div
                  className="absolute border-2 rounded pointer-events-none"
                  style={{
                    left: `${(1 - rtData.forehead_rect[2] / 640) * 100}%`,
                    top: `${(rtData.forehead_rect[1] / 480) * 100}%`,
                    width: `${((rtData.forehead_rect[2] - rtData.forehead_rect[0]) / 640) * 100}%`,
                    height: `${((rtData.forehead_rect[3] - rtData.forehead_rect[1]) / 480) * 100}%`,
                    borderColor: rtData.brow_rising ? "rgb(255, 165, 0)" : "rgb(0, 255, 255)",
                  }}
                >
                  {rtData.heatmap && (
                    <img src={rtData.heatmap} alt="" className="w-full h-full object-cover opacity-40" />
                  )}
                </div>
              )}

              {/* Overlay HUD */}
              <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm rounded-xl p-3 min-w-[180px]">
                {!rtConnected ? (
                  <p className="text-xs text-zinc-400">未连接</p>
                ) : !rtData?.face_detected ? (
                  <p className="text-xs text-rose-400">未检测到人脸</p>
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-zinc-400">皱纹评分</span>
                      <span className={`text-lg font-bold ${severityColor(rtData.severity)}`}>
                        {rtData.wrinkle_score.toFixed(0)}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-zinc-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-150 ${scoreBarColor(rtData.wrinkle_score)}`}
                        style={{ width: `${rtData.wrinkle_score}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-zinc-400">严重度</span>
                      <span className={`text-xs font-medium ${severityColor(rtData.severity)}`}>
                        {SEVERITY_CN[rtData.severity] || rtData.severity}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-zinc-400">抬眉</span>
                      <span className={`text-xs font-bold ${rtData.brow_rising ? "text-orange-400" : "text-zinc-500"}`}>
                        {rtData.brow_rising ? "是" : "否"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-zinc-400">眉眼比</span>
                      <span className="text-xs text-zinc-300">{rtData.brow_eye_ratio.toFixed(2)}x</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Connection indicator */}
              <div className="absolute top-3 right-3">
                <span className={`text-xs px-2 py-1 rounded-full ${rtConnected ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`}>
                  {rtConnected ? "实时" : "离线"}
                </span>
              </div>
            </div>

            {/* Score trend mini chart */}
            {scoreHistory.length > 2 && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                <p className="text-xs text-zinc-500 mb-2">皱纹趋势</p>
                <div className="h-16 flex items-end gap-px">
                  {scoreHistory.map((s, i) => (
                    <div
                      key={i}
                      className={`flex-1 rounded-t transition-all duration-100 ${scoreBarColor(s)}`}
                      style={{ height: `${Math.max(s, 3)}%`, opacity: 0.6 + (i / scoreHistory.length) * 0.4 }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Start/Stop button */}
            <div className="flex gap-3">
              {!rtConnected ? (
                <button onClick={startRealtime} disabled={apiStatus === "offline"}
                  className="flex-1 py-3 bg-violet-600 hover:bg-violet-500 rounded-xl font-semibold disabled:opacity-50 transition-colors">
                  开始实时监测
                </button>
              ) : (
                <button onClick={stopRealtime}
                  className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 rounded-xl font-semibold transition-colors">
                  停止监测
                </button>
              )}
            </div>

            <div className="text-xs text-zinc-600 space-y-1">
              <p>- 实时模式使用浏览器摄像头 + WebSocket 通信</p>
              <p>- 抬眉时皱纹评分会自动放大</p>
              <p>- 请保持正脸面对摄像头</p>
            </div>
          </>
        )}

        {/* ═══════ DAEMON MODE ═══════ */}
        {mode === "daemon" && (
          <div className="space-y-5">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center">
              <div className="text-5xl mb-4">{daemonRunning ? "👁️" : "💤"}</div>
              <h2 className="text-lg font-bold mb-2">
                {daemonRunning ? "监控运行中" : "监控未启动"}
              </h2>
              <p className="text-sm text-zinc-400 mb-4">
                {daemonRunning
                  ? "摄像头正在后台运行，检测到抬眉时将自动提醒"
                  : "开启后，摄像头将在后台静默监控，抬眉时自动提醒你放松"}
              </p>
              <button onClick={toggleDaemon}
                className={`px-6 py-3 rounded-xl font-semibold transition-colors ${
                  daemonRunning
                    ? "bg-rose-600 hover:bg-rose-500"
                    : "bg-violet-600 hover:bg-violet-500"
                }`}>
                {daemonRunning ? "停止监控" : "启动后台监控"}
              </button>
            </div>

            {/* 最近提醒 */}
            {lastAlert && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-amber-400 text-lg">⚠️</span>
                  <span className="text-sm font-medium text-amber-400">
                    检测到抬眉
                  </span>
                </div>
                <p className="text-xs text-amber-400/70">
                  皱纹评分 {lastAlert.score.toFixed(0)} · 请放松额头肌肉
                </p>
              </div>
            )}

            <div className="text-xs text-zinc-600 space-y-1">
              <p>- 后台监控无窗口，静默运行</p>
              <p>- 检测到抬眉 + 皱纹评分 &gt;30 时自动提醒</p>
              <p>- 前3次弹系统通知，之后仅应用内提醒</p>
              <p>- 每次提醒间隔至少15秒，避免打扰</p>
            </div>
          </div>
        )}

        {mode === "photo" && error && <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl p-4 text-sm">{error}</div>}

        {/* ═══════ DAEMON MODE ═══════ */}
        {mode === "daemon" && (
          <div className="space-y-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-200">后台抬眉监控</h3>
                  <p className="text-xs text-zinc-500 mt-1">在电脑前工作时自动检测抬眉，及时提醒放松</p>
                </div>
                <button onClick={toggleDaemon}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                    daemonRunning
                      ? "bg-rose-600 hover:bg-rose-500 text-white"
                      : "bg-violet-600 hover:bg-violet-500 text-white"
                  }`}>
                  {daemonRunning ? "停止监控" : "开始监控"}
                </button>
              </div>

              {daemonRunning && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-emerald-400">监控运行中 — 摄像头已启动</span>
                </div>
              )}

              {lastAlert && daemonRunning && (
                <div className="mt-3 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
                  <p className="text-amber-400 text-sm font-medium">检测到抬眉！</p>
                  <p className="text-amber-400/70 text-xs">皱纹评分: {lastAlert.score.toFixed(0)} — 请放松额头肌肉</p>
                </div>
              )}
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-2">
              <h4 className="text-xs font-semibold text-zinc-400">工作原理</h4>
              <div className="text-xs text-zinc-500 space-y-1">
                <p>1. 后台静默运行，使用摄像头检测面部</p>
                <p>2. 检测到抬眉 + 皱纹评分较高时自动提醒</p>
                <p>3. 每15秒最多提醒一次，避免频繁打扰</p>
                <p>4. 前三次弹系统通知，之后仅应用内提醒</p>
              </div>
            </div>
          </div>
        )}

        <div className="text-xs text-zinc-600 space-y-1 pt-4">
          <p>- SkinAge (EfficientNet-B2) + CV gradient analysis</p>
          <p>- 7区域 x 4维度: 皱纹/色素/红血丝/毛孔</p>
        </div>
      </div>
    </div>
  );
}
