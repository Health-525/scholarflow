"use client";

import { Zap } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { RUNNING_GOAL } from "@/lib/running-utils";
import type { RunStats } from "@/types";

interface RunningStatsProps {
  stats: RunStats;
}

export function RunningStats({ stats }: RunningStatsProps) {
  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-statusSuccess" />
          <span className="text-base font-semibold text-foreground">
            阳光长跑进度
          </span>
          {stats.progressPercent >= 100 && (
            <Badge
              variant="outline"
              className="ml-auto border-statusSuccess/20 bg-statusSuccess/10 text-statusSuccess"
            >
              已达标
            </Badge>
          )}
        </div>

        <div>
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-3xl font-bold text-foreground">
              {stats.total}
            </span>
            <span className="text-sm text-muted-foreground">
              / {RUNNING_GOAL} 次
            </span>
          </div>
          <ProgressBar
            value={stats.progressPercent}
            label={`${Math.round(stats.progressPercent)}%`}
            showPercent
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Card
            hover={false}
            className="p-3 text-center bg-statusSuccess/8 border-statusSuccess/20 hover:translate-y-0 hover:shadow-sm"
          >
            <div className="text-xl font-bold text-statusSuccess">
              {stats.morning}
            </div>
            <div className="text-xs mt-1 text-muted-foreground">
              晨跑
            </div>
          </Card>
          <Card
            hover={false}
            className="p-3 text-center bg-primary/8 border-primary/20 hover:translate-y-0 hover:shadow-sm"
          >
            <div className="text-xl font-bold text-primary">
              {stats.free}
            </div>
            <div className="text-xs mt-1 text-muted-foreground">
              自由跑
            </div>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}

export default RunningStats;
