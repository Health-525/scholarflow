"use client";

import {
  BookmarkCheck,
  Armchair,
  MapPinned,
  CalendarDays,
  Clock,
  X,
  LogOut,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { LibraryReserveStatusInput } from "@/lib/schemas/library";
import type { ReserveStatusStyle } from "@/lib/theme-colors";
import { cn } from "@/lib/utils";

import { formatReserveDate } from "../utils";

export interface ReservationCardProps {
  currentReserve: LibraryReserveStatusInput["reserve"];
  countdown: string | null;
  reserveStatusMap: Record<number, ReserveStatusStyle>;
  onCancelReserve: () => void;
  onHoldSeat: () => void;
  cancelPending: boolean;
  holdPending: boolean;
  onReserve: () => void;
}

export function ReservationCard({
  currentReserve,
  countdown,
  reserveStatusMap,
  onCancelReserve,
  onHoldSeat,
  cancelPending,
  holdPending,
  onReserve,
}: ReservationCardProps) {
  return (
    <Card
      className={cn(
        "mb-5 overflow-hidden relative transition-all",
        currentReserve
          ? "p-4 pl-5 sm:p-5 sm:pl-6 bg-gradient-to-br from-primary/[0.07] to-card border-primary/20"
          : "p-2.5 pl-4 sm:p-3 sm:pl-5 border-border",
      )}
    >
      {currentReserve && (
        <div
          className="absolute top-0 left-0 w-1 h-full"
          style={{
            backgroundColor:
              reserveStatusMap[currentReserve.status]?.color || "#94a3b8",
          }}
        />
      )}

      {currentReserve ? (
        <>
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-primary/10">
                <BookmarkCheck className="w-4 h-4 text-primary" />
              </div>
              <span className="font-semibold text-sm text-foreground">
                当前预约
              </span>
            </div>
            {(() => {
              const statusInfo = reserveStatusMap[currentReserve.status];
              const color = statusInfo?.color || "#94a3b8";
              return (
                <Badge
                  variant="outline"
                  className="text-[11px] border"
                  style={{
                    backgroundColor: `${color}15`,
                    color,
                    borderColor: `${color}30`,
                  }}
                >
                  {statusInfo?.label || `状态${currentReserve.status}`}
                </Badge>
              );
            })()}
          </div>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Armchair className="w-5 h-5 text-primary shrink-0" />
                <span className="text-xl sm:text-2xl font-bold text-foreground tracking-tight truncate">
                  {currentReserve.seat_name || "未知座位"}
                </span>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                  <MapPinned className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">
                    {currentReserve.lib_name || "未知阅览室"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                  <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                  <span>{formatReserveDate(currentReserve.date)}</span>
                </div>
              </div>
              {countdown && currentReserve.status === 1 && (
                <Badge
                  variant="outline"
                  className="mt-3 text-[11px] border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                >
                  <Clock className="w-3 h-3 mr-1" /> {countdown}
                </Badge>
              )}
            </div>
            <div className="flex gap-2 shrink-0">
              {(currentReserve.status === 1 || currentReserve.status === 2) && (
                <Button
                  variant="destructive"
                  onClick={onCancelReserve}
                  disabled={cancelPending}
                  aria-label="取消当前预约"
                >
                  <X className="w-3.5 h-3.5" />
                  {cancelPending ? "取消中..." : "取消"}
                </Button>
              )}
              {currentReserve.status === 2 && (
                <Button
                  variant="outline"
                  onClick={onHoldSeat}
                  disabled={holdPending}
                  className="text-amber-600 border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 hover:text-amber-600"
                  aria-label="暂离座位"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  {holdPending ? "处理中..." : "暂离"}
                </Button>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-secondary">
              <BookmarkCheck className="w-4 h-4 text-muted-foreground" />
            </div>
            <span className="text-[13px] text-foreground font-medium">
              当前暂无预约
            </span>
          </div>
          <Button variant="default" onClick={onReserve}>
            去预约
          </Button>
        </div>
      )}
    </Card>
  );
}
