"use client";

import { useState, useEffect, useCallback } from "react";
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from "lucide-react";

type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

const TOAST_META: Record<ToastType, { icon: typeof CheckCircle2; color: string; bg: string }> = {
  success: { icon: CheckCircle2, color: "#22c55e", bg: "rgba(34,197,94,0.08)" },
  error:   { icon: AlertCircle,  color: "#ef4444", bg: "rgba(239,68,68,0.08)" },
  info:    { icon: Info,         color: "#2a4494", bg: "rgba(42,68,148,0.08)" },
  warning: { icon: AlertTriangle, color: "#f59e0b", bg: "rgba(245,158,11,0.08)" },
};

let toastQueue: Toast[] = [];
const listeners: Set<(toasts: Toast[]) => void> = new Set();

function notifyListeners() {
  listeners.forEach(l => l([...toastQueue]));
}

export function showToast(type: ToastType, message: string, duration = 3000) {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const toast: Toast = { id, type, message, duration };
  toastQueue.push(toast);
  notifyListeners();
  if (duration > 0) {
    setTimeout(() => {
      toastQueue = toastQueue.filter(t => t.id !== id);
      notifyListeners();
    }, duration);
  }
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    listeners.add(setToasts);
    return () => { listeners.delete(setToasts); };
  }, []);

  const dismiss = useCallback((id: string) => {
    toastQueue = toastQueue.filter(t => t.id !== id);
    notifyListeners();
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((toast, i) => {
        const meta = TOAST_META[toast.type];
        return (
          <div
            key={toast.id}
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border shadow-lg animate-fade-up"
            style={{ animationDelay: `${i * 0.05}s` }}
          >
            <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: meta.bg }}>
              <meta.icon className="w-3.5 h-3.5" style={{ color: meta.color }} />
            </div>
            <span className="text-[13px] font-medium text-foreground flex-1">{toast.message}</span>
            <button onClick={() => dismiss(toast.id)} className="shrink-0 p-1 rounded-lg text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default ToastContainer;