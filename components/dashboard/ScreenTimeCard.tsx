"use client";

import { Monitor } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, memo } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useScreenTime } from "@/lib/activity-tracker-v3";

export const ScreenTimeCard = memo(function ScreenTimeCard() {
  const state = useScreenTime();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const hours = Math.floor(state.totalMinutes / 60);
  const minutes = state.totalMinutes % 60;

  return (
    <Link href="/activity">
      <Card className="h-full transition-colors hover:bg-muted/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10">
              <Monitor className="size-4 text-primary" />
            </div>
            <h2 className="text-sm font-semibold text-foreground">屏幕时间</h2>
          </div>

          <div className="text-3xl font-bold tabular-nums text-foreground leading-none">
            {hours > 0 ? `${hours}h ` : ""}
            {minutes}<span className="text-sm font-medium text-muted-foreground">m</span>
          </div>

          {state.categoryBreakdown.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mt-3">
              {state.categoryBreakdown.slice(0, 3).map((c) => (
                <Badge
                  key={c.category}
                  variant="secondary"
                  className="text-xs h-5 px-1.5"
                  style={{ backgroundColor: c.color, color: "white" }}
                >
                  {c.minutes}分
                </Badge>
              ))}
            </div>
          )}

          {mounted && !state.isElectron && state.categoryBreakdown.length === 0 && (
            <p className="mt-2 text-xs text-muted-foreground">桌面版可用</p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
});

export default ScreenTimeCard;
