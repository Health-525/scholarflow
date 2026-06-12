"use client";

import Link from "next/link";
import { Bot, Sparkles, ArrowRight } from "lucide-react";

export function AIChatCard() {
  return (
    <Link href="/chat" className="block rounded-2xl p-4 bg-card border border-border shadow-sm group h-full transition-all duration-200 hover:shadow-md hover:-translate-y-0.5" aria-label="AI 学习助手">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-primary/10 transition-transform duration-200 group-hover:scale-110">
            <Bot className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[13px] font-semibold font-display text-foreground">AI 助手</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-primary/10 text-primary font-medium">Ollama</span>
            </div>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0 transition-all duration-200 group-hover:text-primary group-hover:translate-x-1" />
        </div>

        {/* Sparkle icon as visual anchor */}
        <div className="flex-1 flex items-center justify-center">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-primary/5 border border-primary/10 dark:border-transparent transition-all duration-300 group-hover:scale-105 group-hover:bg-primary/10 group-hover:border-primary/20 dark:group-hover:border-transparent">
            <Sparkles className="w-8 h-8 text-primary/50 group-hover:text-primary transition-colors duration-300" />
          </div>
        </div>

        {/* Quick suggestions */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {["解释PCA", "特征值", "Python"].map(q => (
            <span key={q} className="text-[10px] px-2 py-0.5 rounded-md bg-secondary text-muted-foreground group-hover:bg-primary/5 group-hover:text-primary transition-all duration-200">
              {q}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}

export default AIChatCard;
