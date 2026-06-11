"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { ArrowLeft, RefreshCw, Loader2, Move } from "lucide-react";
import { useSearchParams } from "next/navigation";

interface Seat {
  x: number;
  y: number;
  key: string;
  name: string | null;
  seat_status: number;
  status: boolean;
}

interface LayoutData {
  lib_id: number;
  lib_name: string;
  lib_floor: string;
  lib_rt: {
    seats_total: number;
    seats_used: number;
    seats_has: number;
    open_time_str: string;
    close_time_str: string;
  };
  lib_layout: {
    seats: Seat[];
  };
}

type SeatCategory = "empty" | "available" | "reserved" | "occupied" | "maintenance";

function categorize(seat: Seat): SeatCategory {
  if (seat.seat_status === 0) return "empty";
  if (seat.seat_status === 1) return "available";
  if (seat.seat_status === 2) return "reserved";
  if (seat.seat_status === 3) return "occupied";
  if (seat.seat_status === 4) return "maintenance";
  return "empty";
}

const CATEGORY_STYLE: Record<SeatCategory, { bg: string; border: string; color: string; label: string; hoverBg: string }> = {
  empty:      { bg: "transparent", border: "transparent", color: "transparent", label: "", hoverBg: "transparent" },
  available:  { bg: "rgba(34,197,94,0.2)", border: "rgba(34,197,94,0.6)", color: "#22c55e", label: "空闲", hoverBg: "rgba(34,197,94,0.4)" },
  reserved:   { bg: "rgba(59,130,246,0.15)", border: "rgba(59,130,246,0.4)", color: "#3b82f6", label: "已预约", hoverBg: "rgba(59,130,246,0.25)" },
  occupied:   { bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.3)", color: "#ef4444", label: "占用", hoverBg: "rgba(239,68,68,0.2)" },
  maintenance:{ bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.3)", color: "#f59e0b", label: "维护", hoverBg: "rgba(245,158,11,0.2)" },
};

export default function LibraryLayoutPage() {
  return (
    <Suspense fallback={
      <div className="pb-24 md:pb-8 py-16 text-center">
        <Loader2 className="w-6 h-6 mx-auto animate-spin text-primary" />
        <div className="text-[13px] mt-2 text-muted-foreground">加载座位图...</div>
      </div>
    }>
      <LibraryLayoutInner />
    </Suspense>
  );
}

function LibraryLayoutInner() {
  const searchParams = useSearchParams();
  const libId = searchParams.get("lib_id");

  const [layout, setLayout] = useState<LayoutData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
  const [reserving, setReserving] = useState(false);
  const [reserveResult, setReserveResult] = useState<string | null>(null);
  const [hoverSeat, setHoverSeat] = useState<Seat | null>(null);
  const isDraggingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragState = useRef({ active: false, startX: 0, startY: 0, startScrollX: 0, startScrollY: 0, moved: false });

  const fetchLayout = useCallback(() => {
    if (!libId) { setError("缺少阅览室ID"); setLoading(false); return; }
    setLoading(true); setError(null); setSelectedSeat(null); setReserveResult(null);
    fetch(`/api/library/layout?lib_id=${libId}`)
      .then(r => { if (r.status === 401) throw new Error("JWT_EXPIRED"); return r.json(); })
      .then(json => { if (json.error) throw new Error(json.error); setLayout(json); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [libId]);

  useEffect(() => { fetchLayout(); }, [fetchLayout]);

  // 自动刷新座位状态（30秒）
  useEffect(() => {
    const timer = setInterval(() => {
      if (!libId) return;
      fetch(`/api/library/layout?lib_id=${libId}`)
        .then(r => r.json())
        .then(json => { if (!json.error) setLayout(json); })
        .catch(() => {});
    }, 30000);
    return () => clearInterval(timer);
  }, [libId]);

  const handleReserve = async () => {
    if (!selectedSeat || !libId) return;
    setReserving(true); setReserveResult(null);
    try {
      const r = await fetch("/api/library/reserve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lib_id: parseInt(libId), key: selectedSeat.key }),
      });
      const json = await r.json();
      if (json.error) {
        setReserveResult(`❌ ${json.error}`);
      } else if (json.success) {
        setReserveResult("✅ 选座成功！请按时到馆签到");
        setTimeout(fetchLayout, 1500);
      } else {
        setReserveResult(`⚠️ 未知响应: ${JSON.stringify(json)}`);
      }
    } catch {
      setReserveResult("❌ 网络错误，请检查连接");
    } finally {
      setReserving(false);
    }
  };

  // Pan with mouse drag (scroll-driven)
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const container = containerRef.current;
    if (!container) return;
    dragState.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      startScrollX: container.scrollLeft,
      startScrollY: container.scrollTop,
      moved: false,
    };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragState.current.active) return;
    const container = containerRef.current;
    if (!container) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    if (!dragState.current.moved && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
      dragState.current.moved = true;
      isDraggingRef.current = true;
    }
    if (dragState.current.moved) {
      container.scrollLeft = dragState.current.startScrollX - dx;
      container.scrollTop = dragState.current.startScrollY - dy;
    }
  }, []);

  const onPointerUp = useCallback(() => {
    dragState.current.active = false;
    isDraggingRef.current = false;
    setTimeout(() => { dragState.current.moved = false; }, 10);
  }, []);

  if (loading) {
    return (
      <div className="pb-24 md:pb-8 py-16 text-center">
        <Loader2 className="w-6 h-6 mx-auto animate-spin text-primary" />
        <div className="text-[13px] mt-2 text-muted-foreground">加载座位图...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pb-24 md:pb-8 max-w-md mx-auto py-16 px-4 text-center">
        <p className="text-[13px] text-red-500">{error}</p>
        <button onClick={fetchLayout} className="mt-4 px-4 py-2 rounded-xl text-[13px] font-medium bg-primary text-primary-foreground">
          <RefreshCw className="w-3.5 h-3.5 inline mr-1" />重试
        </button>
      </div>
    );
  }

  if (!layout?.lib_layout?.seats?.length) {
    return (
      <div className="pb-24 md:pb-8 py-8 text-center">
        <p className="text-[13px] text-muted-foreground">暂无座位数据</p>
      </div>
    );
  }

  const seats = layout.lib_layout.seats;
  const visibleSeats = seats.filter(s => s.seat_status !== 0);
  const rt = layout.lib_rt;

  // Guard against empty visible seats
  if (visibleSeats.length === 0) {
    return (
      <div className="pb-24 md:pb-8 py-8 text-center">
        <h1 className="text-lg font-bold text-foreground mb-2">{layout.lib_name}</h1>
        <p className="text-[13px] text-muted-foreground">当前没有可显示的座位</p>
      </div>
    );
  }

  const minX = Math.min(...visibleSeats.map(s => s.x));
  const maxX = Math.max(...visibleSeats.map(s => s.x));
  const minY = Math.min(...visibleSeats.map(s => s.y));
  const maxY = Math.max(...visibleSeats.map(s => s.y));

  const CELL = 36;
  const GAP = 1;
  const mapW = (maxX - minX + 1) * (CELL + GAP);
  const mapH = (maxY - minY + 1) * (CELL + GAP);

  const counts = {
    available: visibleSeats.filter(s => categorize(s) === "available").length,
    reserved: visibleSeats.filter(s => categorize(s) === "reserved").length,
    occupied: visibleSeats.filter(s => categorize(s) === "occupied").length,
    maintenance: visibleSeats.filter(s => categorize(s) === "maintenance").length,
  };

  return (
    <div className="pb-24 md:pb-8 py-6 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => window.history.back()} className="p-2 rounded-xl bg-card border border-border text-muted-foreground">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-foreground">{layout.lib_name}</h1>
            <p className="text-[11px] text-muted-foreground">{layout.lib_floor} · {rt.open_time_str}-{rt.close_time_str}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchLayout} className="p-2 rounded-xl bg-card border border-border text-muted-foreground">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex flex-wrap items-center gap-3 mb-4 rounded-xl p-3 bg-card border border-border">
        <span className="text-xs font-medium text-green-500">● {counts.available} 空闲</span>
        <span className="text-xs font-medium text-blue-500">● {counts.reserved} 已预约</span>
        <span className="text-xs font-medium text-red-500">● {counts.occupied} 占用</span>
        {counts.maintenance > 0 && <span className="text-xs font-medium text-amber-500">● {counts.maintenance} 维护</span>}
        <span className="text-xs text-muted-foreground">共 {rt.seats_total} 座</span>
        <span className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground">
          <Move className="w-3 h-3" />拖拽移动
        </span>
      </div>

      {/* Seat map */}
      <div ref={containerRef}
        className="rounded-2xl overflow-auto select-none bg-card border border-border relative"
        style={{
          cursor: dragState.current.active && dragState.current.moved ? "grabbing" : "grab",
          touchAction: "pan-x pan-y",
          overscrollBehavior: "contain",
          maxHeight: "65vh",
        }}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
      >
        <div className="relative p-4" style={{ width: mapW + 32, height: mapH + 32, minWidth: "100%", minHeight: "100%" }}>
          {visibleSeats.map(seat => {
            const cat = categorize(seat);
            if (cat === "empty") return null;
            const st = CATEGORY_STYLE[cat];
            const isAvailable = cat === "available";
            const isSelected = selectedSeat?.key === seat.key;
            const left = (seat.x - minX) * (CELL + GAP);
            const top = (seat.y - minY) * (CELL + GAP);

            return (
              <button key={seat.key}
                onClick={(e) => { e.stopPropagation(); if (!dragState.current.moved && isAvailable) setSelectedSeat(seat); }}
                onMouseEnter={() => setHoverSeat(seat)}
                onMouseLeave={() => setHoverSeat(null)}
                className="absolute rounded-md font-medium transition-all flex items-center justify-center group"
                style={{
                  left, top,
                  width: CELL, height: CELL,
                  fontSize: 10,
                  backgroundColor: isSelected ? "#22c55e" : (hoverSeat?.key === seat.key ? st.hoverBg : st.bg),
                  color: isSelected ? "#fff" : st.color,
                  border: isSelected ? "2px solid #16a34a" : `1px solid ${st.border}`,
                  cursor: isAvailable ? "pointer" : "default",
                  boxShadow: isSelected ? "0 0 0 2px rgba(34,197,94,0.24)" : (hoverSeat?.key === seat.key ? "0 0 0 1px rgba(138,164,255,0.12)" : "none"),
                  transform: hoverSeat?.key === seat.key && isAvailable ? "scale(1.15)" : "scale(1)",
                  zIndex: hoverSeat?.key === seat.key ? 10 : 1,
                }}
              >
                {seat.name || "·"}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 mt-3 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ backgroundColor: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.5)" }} />空闲可约</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ backgroundColor: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.5)" }} />已预约</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ backgroundColor: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.5)" }} />占用</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ backgroundColor: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.5)" }} />维护</span>
      </div>

      {/* Reserve panel */}
      {selectedSeat && (
        <div className="mt-4 rounded-xl p-4 bg-card border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">座位 {selectedSeat.name}</p>
              <p className="text-[11px] text-muted-foreground">{layout.lib_name}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setSelectedSeat(null)} className="px-3 py-2 rounded-xl text-[12px] bg-card border border-border text-muted-foreground">取消</button>
              <button onClick={handleReserve} disabled={reserving} className="px-4 py-2 rounded-xl text-[13px] font-medium disabled:opacity-50 bg-primary text-primary-foreground">
                {reserving ? <Loader2 className="w-3.5 h-3.5 animate-spin inline mr-1" /> : null}
                {reserving ? "选座中..." : "确认选座"}
              </button>
            </div>
          </div>
          {reserveResult && (
            <p className="mt-2 text-[12px]" style={{ color: reserveResult.includes("成功") ? "#22c55e" : "#ef4444" }}>{reserveResult}</p>
          )}
        </div>
      )}
    </div>
  );
}
