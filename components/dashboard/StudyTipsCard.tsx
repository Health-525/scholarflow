"use client";

import { useState, useEffect } from "react";
import { Sparkles, Brain, BookOpen, Code2, TrendingUp, Target, Clock, Flame } from "lucide-react";

interface StudyTip {
  id: string;
  title: string;
  description: string;
  category: "technique" | "health" | "tool" | "mindset";
  icon: typeof Brain;
}

const TIPS: StudyTip[] = [
  { id: "1", title: "番茄工作法", description: "25分钟专注 + 5分钟休息，每4个番茄后休息15-30分钟。用番茄钟页面开始！", category: "technique", icon: Clock },
  { id: "2", title: "费曼学习法", description: "用最简单的语言解释概念，如果解释不清说明还没真正理解。尝试向AI助手解释！", category: "technique", icon: Brain },
  { id: "3", title: "间隔重复", description: "新知识在1天、3天、7天、14天后复习，记忆留存率从20%提升到80%以上。", category: "technique", icon: TrendingUp },
  { id: "4", title: "主动回忆", description: "合上书本尝试回忆内容，比反复阅读效率高50%。用知识画像页面检测掌握程度。", category: "technique", icon: Target },
  { id: "5", title: "运动促学", description: "跑步后2小时内大脑BDNF水平升高，学习效率提升20%。先跑步再学习！", category: "health", icon: Flame },
  { id: "6", title: "代码实践", description: "学完理论后立即手写代码实现，从numpy到sklearn的完整链路。笔记页面记录过程。", category: "tool", icon: Code2 },
  { id: "7", title: "知识桥接", description: "找到已学知识之间的联系：特征值分解→协方差矩阵→PCA。知识路线图帮你发现桥接点。", category: "mindset", icon: Sparkles },
  { id: "8", title: "深度阅读", description: "精读一篇论文胜过泛读十篇。用笔记页面做结构化笔记，标注关键公式和推导。", category: "tool", icon: BookOpen },
];

const CATEGORY_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  technique: { bg: "rgba(42,68,148,0.08)", color: "#2a4494", label: "方法" },
  health:    { bg: "rgba(245,158,11,0.08)", color: "#f59e0b", label: "健康" },
  tool:      { bg: "rgba(22,163,74,0.08)",  color: "#16a34a", label: "工具" },
  mindset:   { bg: "rgba(139,92,246,0.08)", color: "#8b5cf6", label: "思维" },
};

export function StudyTipsCard() {
  const [currentTip, setCurrentTip] = useState<StudyTip>(TIPS[0]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const idx = Math.floor(Math.random() * TIPS.length);
    setCurrentTip(TIPS[idx]);
  }, []);

  const nextTip = () => {
    const idx = Math.floor(Math.random() * TIPS.length);
    setCurrentTip(TIPS[idx]);
    setExpanded(false);
  };

  const catMeta = CATEGORY_COLORS[currentTip.category];

  return (
    <div className="rounded-2xl p-5 bg-card border border-border shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-primary" />
        <span className="text-[13px] font-semibold text-foreground">学习小贴士</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: catMeta.bg, color: catMeta.color }}>
          {catMeta.label}
        </span>
        <button onClick={nextTip} className="ml-auto text-[11px] px-2 py-1 rounded-lg font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-all">
          换一条
        </button>
      </div>

      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: catMeta.bg }}>
          <currentTip.icon className="w-4 h-4" style={{ color: catMeta.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[14px] font-semibold mb-1 text-foreground">{currentTip.title}</h3>
          {!expanded ? (
            <p className="text-[12px] text-muted-foreground leading-relaxed">
              {currentTip.description.length > 60 ? currentTip.description.slice(0, 60) + "..." : currentTip.description}
              {currentTip.description.length > 60 && (
                <button onClick={() => setExpanded(true)} className="text-primary ml-1 hover:underline">展开</button>
              )}
            </p>
          ) : (
            <p className="text-[12px] text-muted-foreground leading-relaxed animate-fade-up">
              {currentTip.description}
              <button onClick={() => setExpanded(false)} className="text-primary ml-1 hover:underline">收起</button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default StudyTipsCard;
