"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Image from "next/image";

const API_URL = process.env.NEXT_PUBLIC_WRINKLE_API_URL || "http://localhost:8000";

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

const WRINKLE_CONFIG: Record<number, { icon: string; label: string; color: string }> = {
  0: { icon: "😊", label: "无明显皱纹", color: "text-emerald-500" },
  1: { icon: "😐", label: "轻微皱纹", color: "text-amber-500" },
  2: { icon: "😟", label: "明显皱纹", color: "text-rose-500" },
};

type ApiStatus = "checking" | "online" | "offline" | "starting";

export default function WrinklePage() {
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<SkinResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState<ApiStatus>("checking");
  const fileRef = useRef<HTMLInputElement>(null);

  // 检查 API 状态（支持 Electron IPC 自动启动）
  const checkApi = useCallback(async () => {
    setApiStatus("checking");
    try {
      const res = await fetch(`${API_URL}/health`, { signal: AbortSignal.timeout(3000) });
      const data = await res.json();
      setApiStatus(data.skin_analyzer_loaded ? "online" : "offline");
    } catch {
      // HTTP 不可达，尝试通过 Electron IPC 启动
      const api = (window as unknown as { electronAPI?: { visionModelStart: () => Promise<{ ok: boolean; message: string }> } }).electronAPI;
      if (api?.visionModelStart) {
        setApiStatus("starting");
        try {
          const { ok } = await api.visionModelStart();
          if (ok) {
            // 等待服务启动
            for (let i = 0; i < 10; i++) {
              await new Promise(r => setTimeout(r, 1000));
              try {
                const retry = await fetch(`${API_URL}/health`, { signal: AbortSignal.timeout(2000) });
                if (retry.ok) { setApiStatus("online"); return; }
              } catch { /* continue waiting */ }
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

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <h1 className="text-lg font-bold">皮肤检测</h1>
        <div className="flex items-center gap-2">
          <span className={"text-xs px-3 py-1 rounded-full " + (
            apiStatus === "online" ? "bg-emerald-500/15 text-emerald-400" :
            apiStatus === "starting" ? "bg-amber-500/15 text-amber-400" :
            apiStatus === "offline" ? "bg-rose-500/15 text-rose-400" :
            "bg-zinc-800 text-zinc-400")}>
            {apiStatus === "online" ? "✅ 就绪" :
             apiStatus === "starting" ? "⏳ 启动中..." :
             apiStatus === "offline" ? "❌ 离线" :
             "检测中..."}
          </span>
          <button onClick={checkApi} className="text-xs px-2 py-1 rounded bg-zinc-800 text-zinc-400 hover:bg-zinc-700">
            刷新
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* API 离线提示 */}
        {apiStatus === "offline" && (
          <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl p-4 text-sm">
            <p className="font-medium mb-1">检测服务未启动</p>
            <p className="text-xs text-amber-400/70">
              {(window as unknown as { electronAPI?: unknown }).electronAPI
                ? "ScholarFlow 正在尝试自动启动检测服务，请稍后点击「刷新」"
                : "请在终端运行: cd vision-model && python src/api/server.py"}
            </p>
          </div>
        )}

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
            {/* 总评 */}
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

            {/* 各区域评分 */}
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

        {error && <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl p-4 text-sm">{error}</div>}

        <div className="text-xs text-zinc-600 space-y-1 pt-4">
          <p>• 基于 SkinAge (EfficientNet-B2) 多任务模型</p>
          <p>• 7区域 x 4维度: 皱纹/色素/红血丝/毛孔</p>
          <p>• Electron 模式下自动启动检测服务</p>
        </div>
      </div>
    </div>
  );
}
