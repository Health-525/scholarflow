"use client";

import { Info } from "lucide-react";

import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { APP_VERSION } from "@/lib/version";

export function AboutCard() {
  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">关于 ScholarFlow</span>
          </div>
          <span className="text-xs text-muted-foreground">v{APP_VERSION}</span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          按{" "}
          <kbd className="px-1 py-0.5 rounded text-xs font-mono bg-secondary border border-border">
            ?
          </kbd>{" "}
          查看快捷键
        </p>
      </CardContent>
    </Card>
  );
}
