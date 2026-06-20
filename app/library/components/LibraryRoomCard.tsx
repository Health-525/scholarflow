"use client";

import { MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { statusColor } from "@/lib/theme-colors";
import type { LibraryRoom } from "@/types";

export interface LibraryRoomCardProps {
  lib: LibraryRoom;
  onClick: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void;
}

export function LibraryRoomCard({
  lib,
  onClick,
  onKeyDown,
}: LibraryRoomCardProps) {
  const rt = lib.lib_rt;
  const pct =
    rt.seats_total > 0 ? (rt.seats_used / rt.seats_total) * 100 : 0;
  const color = statusColor(pct);

  return (
    <Card
      key={lib.lib_id}
      className="p-4 cursor-pointer"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary shrink-0" />
          <span className="font-semibold text-sm text-foreground">
            {lib.lib_name}
          </span>
        </div>
        <Badge variant="secondary" className="text-[11px]">
          {lib.lib_floor}
        </Badge>
      </div>
      <div className="h-2 rounded-full mb-3 bg-secondary overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <div className="flex items-center justify-between text-[11px]">
        <span className="font-semibold" style={{ color }}>
          {rt.seats_has} 可用
        </span>
        <span className="text-muted-foreground">
          {rt.seats_used}/{rt.seats_total}
          {rt.seats_booking > 0 ? ` · ${rt.seats_booking} 预约中` : ""}
        </span>
      </div>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-2">
        <span>
          {rt.open_time_str} - {rt.close_time_str}
        </span>
        {rt.advance_booking && <span>提前 {rt.advance_booking} 可约</span>}
      </div>
    </Card>
  );
}
