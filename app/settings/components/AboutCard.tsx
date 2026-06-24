"use client";

import { Info } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { APP_VERSION } from "@/lib/version";

export function AboutCard() {
  return (
    <Card className="mb-4 hover:translate-y-0 hover:shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-primary" />
          <CardTitle className="text-[13px] font-semibold">关于</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="text-center">
        <div className="text-[14px] font-semibold mb-1 text-primary font-display">
          ScholarFlow
        </div>
        <div className="text-[11px] text-muted-foreground">
          v{APP_VERSION}
        </div>
        <div className="mt-3 text-[11px] text-muted-foreground">
          按{" "}
          <kbd className="px-1 py-0.5 rounded text-[11px] font-mono bg-secondary border border-border">
            ?
          </kbd>{" "}
          查看快捷键
        </div>
      </CardContent>
    </Card>
  );
}
