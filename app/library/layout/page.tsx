"use client";

import { ArrowLeft, RefreshCw, Loader2, Move, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState, useEffect, useCallback, useRef, Suspense } from "react";

import { useLibraryLayout, useReserveSeat } from "@/hooks/useLibraryQuery";
import { semanticColor, semanticBg, semanticBorder, isDarkMode } from "@/lib/theme-colors";
import type { LibraryLayoutInput } from "@/lib/schemas/library";

type Seat = LibraryLayoutInput["lib_layout"]["seats"][number];

type SeatCategory = "empty" | "available" | "reserved" | "occupied" | "maintenance";

function categorize(seat: Seat): SeatCategory {
  if (seat.seat_status === 0) return "empty";
  if (seat.seat_status === 1) return "available";
  if (seat.seat_status === 2) return "reserved";
  if (seat.seat_status === 3) return "occupied";
  if (seat.seat_status === 4) return "maintenance";
  return "empty";
}

type CategoryStyle = { bg: string; border: string; color: string; label: string; hoverBg: string };

function getCategoryStyles(): Record<SeatCategory, CategoryStyle> {
  const dark = isDarkMode();
  return {
    empty:      { bg: "transparent", border: "transparent", color: "transparent", label: "", hoverBg: "transparent" },
    available:  { bg: semanticBg("success"),  border: semanticBorder("success"),  color: semanticColor("success"),  label: "空闲", hoverBg: dark ? "rgba(63,185,80,0.25)"  : "rgba(34,197,94,0.20)" },
    reserved:   { bg: semanticBg("info"),     border: semanticBorder("info"),     color: semanticColor("info"),     label: "已预约", hoverBg: dark ? "rgba(132,150,240,0.22)" : "rgba(59,130,246,0.18)" },
    occupied:   { bg: semanticBg("error"),    border: semanticBorder("error"),    color: semanticColor("error"),    label: "占用", hoverBg: dark ? "rgba(248,81,73,0.20)"   : "rgba(239,68,68,0.16)" },
    maintenance:{ bg: semanticBg("warning"),  border: semanticBorder("warning"),  color: semanticColor("warning"),  label: "维护", hoverBg: dark ? "rgba(210,153,34,0.20)"  : "rgba(245,158,11,0.16)" },
  };
}

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

  const { data: layout, isLoading, error, refetch } = useLibraryLayout(libId);
  const reserveSeat = useReserveSeat();

  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
  const [reserveResult, setReserveResult] = useState<string | null>(null);
  const [hoverSeat, setHoverSeat] = useState<Seat | null>(null);
  const [scale, setScale] = useState(1);
  const [dragging, setDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragState = useRef({ active: false, startX: 0, startY: 0, startScrollX: 0, startScrollY: 0, moved: false });
  const CATEGORY_STYLE = getCategoryStyles();

  // 切换阅览室时重置选区与结果
  useEffect(() => {
    setSelectedSeat(null);
    setReserveResult(null);
  }, [libId]);

  const handleRefresh = useCallback(() => {
    setSelectedSeat(null);
    setReserveResult(null);
    refetch();
  }, [refetch]);

  const handleReserve = useCallback(async () => {
    if (!selectedSeat || !libId) return;
    setReserveResult(null);
    reserveSeat.mutate(
      { libId: parseInt(libId, 10), key: selectedSeat.key },
      {
        onSuccess: () => {
          setReserveResult("✅ 选座成功！请按时到馆签到");
          setSelectedSeat(null);
        },
        onError: (err) => {
          setReserveResult(`❌ ${err.message}`);
        },
      }
    );
  }, [selectedSeat, libId, reserveSeat]);

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
    const dx = (e.clientX - dragState.current.startX) / scale;
    const dy = (e.clientY - dragState.current.startY) / scale;
    if (!dragState.current.moved && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
      dragState.current.moved = true;
      setDragging(true);
    }
    if (dragState.current.moved) {
      container.scrollLeft = dragState.current.startScrollX - dx;
      container.scrollTop = dragState.current.startScrollY - dy;
    }
  }, [scale]);

  const onPointerUp = useCallback(() => {
    dragState.current.active = false;
    setDragging(false);
    setTimeout(() => { dragState.current.moved = false; }, 10);
  }, []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setScale((s) => Math.min(2.5, Math.max(0.5, Math.round((s + delta) * 10) / 10)));
    }
  }, []);

  const zoomIn = useCallback(() => setScale((s) => Math.min(2.5, Math.round((s + 0.2) * 10) / 10)), []);
  const zoomOut = useCallback(() => setScale((s) => Math.max(0.5, Math.round((s - 0.2) * 10) / 10)), []);
  const resetZoom = useCallback(() => setScale(1), []);

  if (isLoading) {
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
        <p className="text-[13px] text-destructive">{error.message}</p>
        <button onClick={handleRefresh} className="mt-4 px-4 py-2 rounded-xl text-[13px] font-medium bg-primary text-primary-foreground">
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
          <button onClick={handleRefresh} className="p-2 rounded-xl bg-card border border-border text-muted-foreground">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex flex-wrap items-center gap-3 mb-4 rounded-xl p-3 bg-card border border-border">
        <span className="text-xs font-medium text-[var(--status-success)]">● {counts.available} 空闲</span>
        <span className="text-xs font-medium text-[var(--status-info)]">● {counts.reserved} 已预约</span>
        <span className="text-xs font-medium text-[var(--status-error)]">● {counts.occupied} 占用</span>
        {counts.maintenance > 0 && <span className="text-xs font-medium text-[var(--status-warning)]">● {counts.maintenance} 维护</span>}
        <span className="text-xs text-muted-foreground">共 {rt.seats_total} 座</span>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={zoomOut} className="p-1.5 rounded-lg bg-secondary border border-border text-muted-foreground hover:text-foreground" title="缩小">
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] tabular-nums text-muted-foreground min-w-[42px] text-center">{Math.round(scale * 100)}%</span>
          <button onClick={zoomIn} className="p-1.5 rounded-lg bg-secondary border border-border text-muted-foreground hover:text-foreground" title="放大">
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button onClick={resetZoom} className="p-1.5 rounded-lg bg-secondary border border-border text-muted-foreground hover:text-foreground" title="重置缩放">
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <span className="hidden sm:flex items-center gap-1 text-[10px] text-muted-foreground border-l border-border pl-2 ml-1">
            <Move className="w-3 h-3" />拖拽移动
          </span>
        </div>
      </div>

      {/* Seat map */}
      <div ref={containerRef}
        className="rounded-2xl overflow-auto select-none bg-card border border-border relative"
        style={{
          cursor: dragging ? "grabbing" : "grab",
          touchAction: "none",
          overscrollBehavior: "contain",
          maxHeight: "65vh",
        }}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
        onWheel={onWheel}
        onDoubleClick={resetZoom}
      >
        <div className="relative p-4 origin-top-left transition-transform duration-150 ease-out" style={{ width: (mapW + 32) * scale, height: (mapH + 32) * scale, minWidth: "100%", minHeight: "100%", transform: `scale(${scale})` }}>
          {visibleSeats.map(seat => {
            const cat = categorize(seat);
            if (cat === "empty") return null;
            const st = CATEGORY_STYLE[cat];
            const isAvailable = cat === "available";
            const isSelected = selectedSeat?.key === seat.key;
            const left = (seat.x - minX) * (CELL + GAP);
            const top = (seat.y - minY) * (CELL + GAP);

            return (
              <button
                key={seat.key}
                type="button"
                aria-label={`座位 ${seat.name || seat.key}，${isAvailable ? "空闲可选" : st.label}`}
                aria-pressed={isAvailable ? isSelected : undefined}
                aria-disabled={!isAvailable}
                tabIndex={isAvailable ? 0 : -1}
                onClick={(e) => { e.stopPropagation(); if (!dragState.current.moved && isAvailable) setSelectedSeat(seat); }}
                onMouseEnter={() => setHoverSeat(seat)}
                onMouseLeave={() => setHoverSeat(null)}
                className="absolute rounded-md font-medium transition-all flex items-center justify-center group"
                style={{
                  left, top,
                  width: CELL, height: CELL,
                  fontSize: 10,
                  backgroundColor: isSelected ? semanticColor("success") : (hoverSeat?.key === seat.key ? st.hoverBg : st.bg),
                  color: isSelected ? "var(--primary-foreground)" : st.color,
                  border: isSelected ? `2px solid ${semanticColor("success")}` : `1px solid ${st.border}`,
                  cursor: isAvailable ? "pointer" : "default",
                  boxShadow: isSelected ? "0 0 0 2px rgba(var(--status-success-rgb), 0.24)" : (hoverSeat?.key === seat.key ? "0 0 0 1px rgba(var(--primary-rgb), 0.12)" : "none"),
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
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ backgroundColor: semanticBg("success"), border: `1px solid ${semanticBorder("success")}` }} />空闲可约</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ backgroundColor: semanticBg("info"), border: `1px solid ${semanticBorder("info")}` }} />已预约</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ backgroundColor: semanticBg("error"), border: `1px solid ${semanticBorder("error")}` }} />占用</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ backgroundColor: semanticBg("warning"), border: `1px solid ${semanticBorder("warning")}` }} />维护</span>
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
              <button onClick={handleReserve} disabled={reserveSeat.isPending} className="px-4 py-2 rounded-xl text-[13px] font-medium disabled:opacity-50 bg-primary text-primary-foreground">
                {reserveSeat.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin inline mr-1" /> : null}
                {reserveSeat.isPending ? "选座中..." : "确认选座"}
              </button>
            </div>
          </div>
          {reserveResult && (
            <p className="mt-2 text-[12px]" style={{ color: reserveResult.includes("成功") ? semanticColor("success") : semanticColor("error") }}>{reserveResult}</p>
          )}
        </div>
      )}
    </div>
  );
}
