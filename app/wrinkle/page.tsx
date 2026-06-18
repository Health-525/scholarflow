"use client";

import { Sparkles } from "lucide-react";

export default function WrinklePage() {
  return (
    <div className="max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center px-4 animate-page">
      <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center mb-6">
        <Sparkles className="w-8 h-8 text-primary/60" />
      </div>
      <h1 className="text-xl font-bold font-display text-foreground mb-2">皮肤检测</h1>
      <p className="text-sm text-muted-foreground mb-1">该功能正在开发中</p>
      <p className="text-xs text-muted-foreground/60">敬请期待</p>
    </div>
  );
}
