"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";

const API_URL = process.env.NEXT_PUBLIC_WRINKLE_API_URL || "http://localhost:8000";

const LABEL_CONFIG: Record<number, { icon: string; label: string; color: string }> = {
  0: { icon: "😊", label: "无明显皱纹", color: "text-emerald-500" },
  1: { icon: "😐", label: "轻微皱纹", color: "text-amber-500" },
  2: { icon: "😟", label: "明显皱纹", color: "text-rose-500" },
};

interface Result {
  success: boolean;
  face_detected: boolean;
  wrinkle_level: number;
  wrinkle_label: string;
  confidence: number;
  message: string;
}

export default function WrinklePage() {
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState<"unknown" | "ok" | "err">("unknown");
  const fileRef = useRef<HTMLInputElement>(null);

  const checkApi = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/health`);
      const data = await res.json();
      setApiStatus(data.model_loaded ? "ok" : "err");
    } catch { setApiStatus("err"); }
  }, []);

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
      const res = await fetch(`${API_URL}/predict`, { method: "POST", body: form });
      setResult(await res.json());
    } catch { setError("无法连接检测服务，请确保 API 已启动"); }
    finally { setLoading(false); }
  };

  const reset = () => {
    setPreview(null); setResult(null); setError(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const config = result ? LABEL_CONFIG[result.wrinkle_level] : null;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <h1 className="text-lg font-bold">🧬 皱纹检测</h1>
        <button onClick={checkApi}
          className={"text-xs px-3 py-1 rounded-full " + (
            apiStatus === "ok" ? "bg-emerald-500/15 text-emerald-400" :
            apiStatus === "err" ? "bg-rose-500/15 text-rose-400" :
            "bg-zinc-800 text-zinc-400")}>
          {apiStatus === "ok" ? "✅ 就绪" : apiStatus === "err" ? "❌ 离线" : "检查"}
        </button>
      </div>
      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
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
              <button onClick={detect} disabled={loading}
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
            AI 正在分析额头纹理...
          </div>
        )}
        {result && config && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-4">
              <span className="text-5xl">{config.icon}</span>
              <div>
                <h2 className={"text-xl font-bold " + config.color}>{config.label}</h2>
                <p className="text-sm text-zinc-400">置信度: {(result.confidence * 100).toFixed(1)}%</p>
              </div>
            </div>
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700 bg-violet-500" style={{ width: `${result.confidence * 100}%` }} />
            </div>
            {result.message && <div className="bg-violet-500/10 text-violet-300 rounded-lg p-3 text-sm">{result.message}</div>}
          </div>
        )}
        {error && <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl p-4 text-sm">{error}</div>}
        <div className="text-xs text-zinc-600 space-y-1 pt-4">
          <p>• 检测基于 MobileNetV3 轻量模型，仅分析额头区域纹理</p>
          <p>• 结果仅供参考，不作为医学诊断依据</p>
          <p>• 需要本地运行 vision-model API 服务</p>
        </div>
      </div>
    </div>
  );
}
